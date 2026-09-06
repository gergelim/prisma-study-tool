# 🎯 Prisma Study Tool

> Plataforma local, autônoma e offline para estudos, resolução de questões de vestibulares e concursos, com importador automatizado, dashboard de métricas e suporte a temas claro e escuro.

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](#licen%C3%A7a)
[![Database](https://img.shields.io/badge/Database-SQLite3-orange.svg)](https://www.sqlite.org/)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen.svg)](#)

---

## 📖 Visão Geral

O **Prisma Study Tool** foi desenvolvido para oferecer a melhor experiência de estudo por questões, permitindo que você tenha controle total sobre seus dados e pratique mesmo sem internet. 

A aplicação conecta-se à base de questões públicas do *Estude Prisma*, realiza a extração organizada dos dados para um banco de dados **SQLite local** e disponibiliza uma interface web fluida, rápida e responsiva.

---

## ✨ Principais Recursos

- 📚 **24 Disciplinas & 897 Assuntos Pré-carregados:** Acompanha semente inicial de dados (*seed data*). Ao iniciar o projeto, todas as matérias oficiais (Português, Matemática, Biologia, Física, Química, História, Geografia, etc.) já estão disponíveis imediatamente, sem telas vazias.
- 📥 **Importador Resiliente com Função Reparar:** Extrai questões completas com enunciado, alternativas, gabarito e comentários do professor. Se a conexão falhar ou houver timeout de rede (ex: erro 504), o card em *Importações Recentes* exibe o botão **🛠️ Reparar**, retomando a importação exatamente de onde parou.
- ✏️ **Ambiente Interativo de Resolução (Quiz):** Validação instantânea de respostas, indicação de acerto/erro, temporizador e comentários pedagógicos explicativos.
- 🔍 **Google Search Grabber para Questões Erradas:** Errou uma questão difícil? Um clique higieniza o enunciado e abre a busca no Google com explicações comentadas e fóruns de discussão.
- 🖼️ **Zoom em Imagens e Diagramas:** Clique em qualquer figura, mapa, charge ou fórmula para abrir o modal de ampliação em tela cheia.
- 📊 **Dashboard de Desempenho:** Gráficos e indicadores de precisão por matéria, histórico de resoluções e lista de próximas questões não resolvidas.
- ☀️/🌙 **Modo Claro e Modo Escuro:** Design system moderno com alternância instantânea de temas e persistência automática no navegador.
- 🔒 **100% Local e Privado:** Nenhum dado de progresso é enviado a servidores externos. Seu histórico pertence a você.

---

## 🚀 Pré-requisitos

Para executar a solução localmente, você precisa ter instalado no seu computador:

1. **[Node.js](https://nodejs.org/)** (versão 18.x, 20.x ou superior recomendada)
2. **[Git](https://git-scm.com/)**

---

## ⚡ Como Executar Localmente (Passo a Passo)

### 1. Clonar o repositório
Abra o seu terminal (Bash, PowerShell ou Prompt de Comando) e execute:

```bash
git clone https://github.com/gergelim/prisma-study-tool.git
cd prisma-study-tool
```

### 2. Instalar as dependências
Execute o comando abaixo para instalar as dependências necessárias (`express`, `better-sqlite3`, `cheerio`, `axios`, etc.):

```bash
npm install
```

### 3. Iniciar o servidor
Inicie a aplicação com o comando:

```bash
npm start
```

Você verá a seguinte mensagem de confirmação no console:

```text
  ╔══════════════════════════════════════════╗
  ║       🎯  Prisma Study Tool v1.0         ║
  ╠══════════════════════════════════════════╣
  ║  ► Acesse: http://localhost:3000         ║
  ╠══════════════════════════════════════════╣
  ║  Pressione Ctrl+C para encerrar          ║
  ╚══════════════════════════════════════════╝
```

### 4. Acessar a aplicação
Abra o seu navegador de preferência e acesse:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🧭 Guia de Uso

### 🏠 1. Dashboard
- Ao acessar a aplicação, você vê a quantidade de disciplinas carregadas, o número de questões salvas e a taxa global de acertos.
- Use os botões de atalho: **▶ Próxima Questão Não Feita** ou **📋 Ver Todas as Questões**.

### ⬇️ 2. Importando Questões
1. Acesse o menu **Importar Questões**.
2. Selecione a **Disciplina** desejada no seletor (ex: *Biologia*, *Física*, *História*).
3. Opcionalmente, selecione um **Assunto/Tópico específico** e informe um limite de questões (ou deixe em branco para importar tudo).
4. Clique em **Iniciar Importação**.
5. O progresso é exibido em tempo real. Se ocorrer qualquer instabilidade de rede ou timeout (status 504), utilize o botão **🛠️ Reparar** no card da importação recente para retomar o processo.

### 📋 3. Lista e Filtros de Questões
- Filtre por matéria, assunto, status de resolução (*Todas*, *Não respondidas*, *Acertadas*, *Erradas*) ou pesquise por palavras-chave presentes no texto do enunciado.

### ✏️ 4. Resolvendo Questões
- Clique na alternativa escolhida (A, B, C, D ou E) e clique em **Confirmar Resposta**.
- O gabarito é conferido imediatamente:
  - Se acertar: parabéns! Veja o comentário explicativo do professor.
  - Se errar: além da resposta correta, é exibido o card **🔍 Pesquisar no Google**, permitindo abrir resoluções comentadas diretamente em nova aba.
- Toque em qualquer imagem ou fórmula do enunciado para ampliá-la em tela cheia.

---

## ❓ FAQ — Perguntas Frequentes & Solução de Problemas

### 1. Como alterar a porta do servidor se a porta 3000 já estiver em uso?
Você pode definir a variável de ambiente `PORT` antes de iniciar:

- **Linux / macOS:**
  ```bash
  PORT=8080 npm start
  ```
- **Windows (PowerShell):**
  ```powershell
  $env:PORT=8080; npm start
  ```
- **Windows (CMD):**
  ```cmd
  set PORT=8080 && npm start
  ```

### 2. Onde ficam salvas minhas questões e meu histórico de estudos?
Todos os dados ficam armazenados localmente no arquivo SQLite em:
`data/prisma.db`  
Este arquivo é criado automaticamente na primeira inicialização e possui migrações automáticas.

### 3. Preciso de internet o tempo todo para usar a ferramenta?
**Não!** Você só precisa de internet no momento de importar novas questões. Depois que as questões foram importadas para o seu banco local, você pode estudar, resolver simulados e acompanhar seu progresso 100% offline.

### 4. Como funciona a função "🛠️ Reparar" nas importações?
Ao importar grandes volumes de questões, o servidor de origem pode apresentar lentidão temporária (como erro HTTP 504 Gateway Timeout). Quando isso ocorre, o sistema salva o ponto exato da última página processada. Ao clicar em **Reparar**, o importador retoma a partir da página interrompida, evitando duplicatas e poupando tempo.

### 5. Como resetar meu banco de dados para o estado inicial?
Para recomeçar do zero:
1. Encerre o servidor (`Ctrl + C`).
2. Delete o arquivo `data/prisma.db` (ou a pasta `data/`).
3. Inicie novamente com `npm start`. O sistema recriará o banco limpo e restaurará automaticamente todas as 24 disciplinas e 897 assuntos a partir do `seed-data.json`.

---

## 🛠️ Tecnologias Utilizadas

- **Backend:** Node.js, Express.js
- **Banco de Dados:** SQLite 3 via `better-sqlite3` (rápido, embarcado e síncrono)
- **Scraping & Requisições:** Axios (com retry exponencial para resiliência de rede) e Cheerio
- **Frontend:** SPA nativa (HTML5, Vanilla CSS com CSS Custom Properties e JavaScript modular ES6+)
- **Ícones & Fontes:** Google Fonts (Inter) e SVG inline otimizado

---

## 📂 Estrutura do Projeto

```text
prisma-study-tool/
├── api/                  # Rotas REST (subjects, questions, import, progress)
│   └── routes/
├── database/             # Conexão SQLite, migrations e dados de seed inicial
│   ├── db.js
│   ├── migrations.js
│   └── seed-data.json    # 24 disciplinas e 897 tópicos pré-configurados
├── data/                 # Diretório onde o banco prisma.db é criado
├── public/               # Frontend da aplicação web
│   ├── css/
│   │   └── style.css     # Design System (Modo Escuro e Claro)
│   ├── js/
│   │   ├── app.js        # Estado global, router, tema
│   │   ├── dashboard.js  # Métricas e resumo
│   │   ├── import.js     # Painel de importação e reparo
│   │   ├── questions.js  # Listagem e filtros
│   │   ├── quiz.js       # Resolução de questões e Google grabber
│   │   └── progress.js   # Estatísticas por disciplina
│   └── index.html        # Shell SPA da aplicação
├── scraper/              # Motor de extração e cliente GraphQL
│   ├── graphql.js
│   ├── images.js
│   ├── index.js
│   └── parser.js
├── package.json
├── server.js             # Ponto de entrada do servidor Node/Express
└── README.md             # Documentação oficial
```

---

## 📄 Licença

Distribuído sob a licença MIT. Consulte o arquivo `LICENSE` para mais detalhes.

---

Feito com dedicação para turbinar sua preparação para vestibulares e concursos! 🚀
