const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

let splashWindow = null;
let mainWindow = null;
let serverInstance = null;

const PORT = process.env.PORT || 3000;
const SERVER_URL = `http://localhost:${PORT}`;

// Configuração de diretório persistente para produção (AppData/know)
if (app.isPackaged) {
  process.env.KNOW_DATA_DIR = path.join(app.getPath('userData'), 'data');
}

/**
 * Cria a janela de Splash Screen (sem bordas, centralizada)
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 320,
    transparent: true,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
  });

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/**
 * Cria a janela principal da aplicação know
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1260,
    height: 840,
    minWidth: 920,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'know — Prática de Questões',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    backgroundColor: '#0c0f17',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Abre links externos no navegador padrão do usuário
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.once('ready-to-show', () => {
    // Transição suave da splash para a janela principal
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.destroy();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    }, 1100);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Inicia o servidor Express se ainda não estiver ativo
 */
function startServer() {
  return new Promise((resolve) => {
    // Testa se o servidor já está rodando (modo dev por exemplo)
    const req = http.get(SERVER_URL, () => {
      console.log('[Electron] Servidor já em execução em', SERVER_URL);
      resolve();
    });

    req.on('error', () => {
      // Inicia o servidor internamente
      try {
        const expressApp = require('./server');
        // Se server.js já fez listen, o erro não deve travar
        console.log('[Electron] Servidor interno iniciado em', SERVER_URL);
        resolve();
      } catch (err) {
        console.error('[Electron] Erro ao iniciar servidor Express:', err);
        resolve();
      }
    });
  });
}

/**
 * Aguarda o servidor HTTP responder antes de carregar a URL
 */
function waitForServer(retries = 30, interval = 250) {
  return new Promise((resolve, reject) => {
    let count = 0;
    const check = () => {
      count++;
      const req = http.get(SERVER_URL, (res) => {
        resolve();
      });

      req.on('error', () => {
        if (count >= retries) {
          reject(new Error('Tempo limite aguardando inicialização do servidor.'));
        } else {
          setTimeout(check, interval);
        }
      });
    };
    check();
  });
}

app.whenReady().then(async () => {
  createSplashWindow();

  try {
    await startServer();
    await waitForServer();
    createMainWindow();
    mainWindow.loadURL(SERVER_URL);
  } catch (err) {
    console.error('[Electron] Falha na inicialização:', err);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.webContents.executeJavaScript(`
        const el = document.getElementById('splash-status');
        if (el) { el.textContent = 'Erro ao carregar banco local. Tentando novamente...'; el.style.color = '#ef4444'; }
      `);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
      mainWindow.loadURL(SERVER_URL);
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
