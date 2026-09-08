// ── State ────────────────────────────────────────────────────
const state = {
  currentPage: 'dashboard',
  disciplines: [],
  questions: [],
  currentQuestion: null,
  questionFilter: 'all',
  questionDiscipline: '',
  questionSubject: '',
  questionPage: 1,
  questionTotal: 0,
  importJobId: null,
  importInterval: null,
};

// ── API Helpers ──────────────────────────────────────────────
async function api(method, path, body) {
  try {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    return await res.json();
  } catch (e) {
    console.error('API error:', e);
    return { error: e.message };
  }
}

const GET  = (p)    => api('GET', p);
const POST = (p, b) => api('POST', p, b);

// ── Router ───────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) pageEl.classList.add('active');

  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');

  // Close mobile nav if open
  const headerNav = document.getElementById('header-nav');
  if (headerNav) headerNav.classList.remove('mobile-open');

  state.currentPage = page;
  window.location.hash = `#/${page}`;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'dashboard') renderDashboard();
  if (page === 'import')    renderImport();
  if (page === 'questions') renderQuestions();
  if (page === 'progress')  renderProgress();
}

// ── Toast Notifications ──────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Strip HTML helper ────────────────────────────────────────
function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

// ── Format date ──────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Discipline color dot ─────────────────────────────────────
function colorDot(color) {
  return `<span class="disc-color-dot" style="background:${color||'#6366f1'}"></span>`;
}

// ── Theme Management ─────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('prisma_theme') || 'dark';
  applyTheme(saved, false);
}

function applyTheme(theme, showNotice = false) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('prisma_theme', theme);

  const icons = document.querySelectorAll('.theme-toggle-icon');
  const labels = document.querySelectorAll('.theme-toggle-label');
  const isLight = theme === 'light';

  icons.forEach(i => i.textContent = isLight ? '🌙' : '☀️');
  labels.forEach(l => l.textContent = isLight ? 'Modo Escuro' : 'Modo Claro');

  const btn = document.getElementById('theme-toggle-btn');
  if (btn) {
    btn.title = isLight ? 'Alternar para Modo Escuro (🌙)' : 'Alternar para Modo Claro (☀️)';
  }

  if (showNotice) {
    showToast(isLight ? '☀️ Modo Claro ativado' : '🌙 Modo Escuro ativado', 'info');
  }
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next, true);
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();

  // Wire nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // Load disciplines into state
  await loadDisciplines();

  // Route on load
  const hash = window.location.hash.replace('#/', '');
  navigate(hash || 'dashboard');
});

async function loadDisciplines() {
  const data = await GET('/subjects');
  state.disciplines = data.disciplines || [];
}

// ── DASHBOARD ─────────────────────────────────────────────────
async function renderDashboard() {
  const el = document.getElementById('dashboard-content');
  el.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Carregando...</span></div>`;

  const [dashData, subjData] = await Promise.all([
    GET('/progress/dashboard'),
    GET('/subjects')
  ]);

  const d = dashData.dashboard || {};
  const disciplines = subjData.disciplines || [];
  state.disciplines = disciplines;

  el.innerHTML = `
    <div class="stats-grid">
      <div class="card">
        <div class="card-title">Total de Questões</div>
        <div class="card-value accent">${d.totalQuestions?.toLocaleString('pt-BR') || 0}</div>
        <div class="card-sub">${d.totalDisciplines || 0} matérias</div>
      </div>
      <div class="card">
        <div class="card-title">Questões Feitas</div>
        <div class="card-value">${d.totalAnswered?.toLocaleString('pt-BR') || 0}</div>
        <div class="card-sub">${d.overallPct || 0}% do total</div>
      </div>
      <div class="card">
        <div class="card-title">Não Feitas</div>
        <div class="card-value yellow">${d.totalUnanswered?.toLocaleString('pt-BR') || 0}</div>
        <div class="card-sub">questões pendentes</div>
      </div>
      <div class="card">
        <div class="card-title">Acertos</div>
        <div class="card-value green">${d.totalCorrect?.toLocaleString('pt-BR') || 0}</div>
        <div class="card-sub">${d.correctPct || 0}% de aproveitamento</div>
      </div>
      <div class="card">
        <div class="card-title">Erros</div>
        <div class="card-value red">${d.totalIncorrect?.toLocaleString('pt-BR') || 0}</div>
      </div>
    </div>

    ${d.totalQuestions > 0 ? `
    <div class="mb-16">
      <div class="text-muted mb-8" style="font-size:12px;text-transform:uppercase;letter-spacing:.5px;font-weight:600;">Progresso Geral</div>
      <div class="progress-bar-wrap" style="height:10px">
        <div class="progress-bar-fill" style="width:${d.overallPct||0}%"></div>
      </div>
      <div class="flex justify-between mt-8" style="font-size:11px;color:var(--text-muted)">
        <span>${d.overallPct||0}% concluído</span>
        <span>${d.correctPct||0}% de acerto</span>
      </div>
    </div>` : ''}

    <div class="section">
      <div class="section-header">
        <div class="section-title">📚 Matérias Disponíveis</div>
        <button class="btn btn-secondary btn-sm" onclick="navigate('import')">+ Importar questões</button>
      </div>
      <div class="section-body">
        ${disciplines.length === 0
          ? `<div class="empty-state">
              <div class="empty-icon">📂</div>
              <div class="empty-title">Nenhuma matéria carregada</div>
              <div class="empty-text">Sincronize as disciplinas para começar</div>
              <button class="btn btn-primary" onclick="syncDisciplines()">Sincronizar disciplinas</button>
            </div>`
          : `<div class="disc-mini-list">
              ${disciplines.map(d => `
                <div class="disc-mini-card" onclick="goToQuestions('${d.id}')">
                  <div class="disc-name">${colorDot(d.color)}${d.name}</div>
                  <div class="disc-count">${d.questionCount?.toLocaleString('pt-BR') || 0} questões</div>
                </div>
              `).join('')}
            </div>`
        }
      </div>
    </div>

    ${d.totalQuestions > 0 ? `
    <div class="flex gap-12 flex-wrap mt-16">
      <button class="btn btn-primary btn-lg" onclick="startNextQuestion()">▶ Próxima Questão Não Feita</button>
      <button class="btn btn-secondary btn-lg" onclick="navigate('questions')">📋 Ver Todas as Questões</button>
    </div>` : ''}
  `;
}

async function syncDisciplines() {
  showToast('Sincronizando disciplinas...', 'info');
  const result = await POST('/subjects/sync');
  if (result.error) {
    showToast('Erro: ' + result.error, 'error');
  } else {
    showToast(result.message || 'Sincronizado!', 'success');
    await loadDisciplines();
    renderDashboard();
  }
}

async function startNextQuestion() {
  const data = await GET('/questions/next-unanswered');
  if (data.questionId) {
    loadQuiz(data.questionId);
    navigate('quiz');
  } else {
    showToast('Nenhuma questão não feita encontrada!', 'info');
  }
}

function goToQuestions(disciplineId) {
  state.questionDiscipline = disciplineId;
  state.questionFilter = 'all';
  state.questionPage = 1;
  navigate('questions');
}
