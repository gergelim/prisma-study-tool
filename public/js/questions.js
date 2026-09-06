// ── QUESTIONS LIST PAGE ──────────────────────────────────────
async function renderQuestions() {
  const el = document.getElementById('questions-content');

  if (!state.disciplines || state.disciplines.length === 0) {
    await loadDisciplines();
  }

  // Build discipline select
  const discOptions = state.disciplines.map(d =>
    `<option value="${d.id}" ${state.questionDiscipline === d.id ? 'selected' : ''}>${d.name}</option>`
  ).join('');

  const selectedDisc = state.disciplines.find(d => d.id === state.questionDiscipline);
  let subjOptions = '<option value="">Todos os assuntos</option>';
  if (selectedDisc && selectedDisc.subjects) {
    selectedDisc.subjects.forEach(s => {
      subjOptions += `<option value="${s.id}" ${state.questionSubject === s.id ? 'selected' : ''}>${s.name}</option>`;
      if (s.children) {
        s.children.forEach(c => {
          subjOptions += `<option value="${c.id}" ${state.questionSubject === c.id ? 'selected' : ''}>  └ ${c.name}</option>`;
        });
      }
    });
  }

  el.innerHTML = `
    <!-- Filters Bar -->
    <div class="flex gap-12 flex-wrap mb-16">
      <select class="form-control" style="width:auto;min-width:180px" id="q-disc-select" onchange="onDiscChange()">
        <option value="">Todas as matérias</option>
        ${discOptions}
      </select>
      <select class="form-control" style="width:auto;min-width:180px" id="q-subj-select" onchange="onSubjChange()">
        ${subjOptions}
      </select>
      <button class="btn btn-secondary btn-sm" onclick="startNextQuestion()">▶ Próxima não feita</button>
    </div>

    <div class="filters-bar">
      <button class="filter-btn ${state.questionFilter==='all'?'active':''}" onclick="setFilter('all')">📋 Todas</button>
      <button class="filter-btn ${state.questionFilter==='unanswered'?'active':''}" onclick="setFilter('unanswered')">⚪ Não feitas</button>
      <button class="filter-btn ${state.questionFilter==='answered'?'active':''}" onclick="setFilter('answered')">🔵 Feitas</button>
      <button class="filter-btn ${state.questionFilter==='correct'?'active':''}" onclick="setFilter('correct')">🟢 Acertadas</button>
      <button class="filter-btn ${state.questionFilter==='incorrect'?'active':''}" onclick="setFilter('incorrect')">🔴 Erradas</button>
    </div>

    <div id="questions-list-container">
      <div class="loading-overlay"><div class="spinner"></div><span>Carregando questões...</span></div>
    </div>
  `;

  await loadQuestionsList();
}

async function onDiscChange() {
  state.questionDiscipline = document.getElementById('q-disc-select').value;
  state.questionSubject = '';
  state.questionPage = 1;

  // Update subjects dropdown
  const subjEl = document.getElementById('q-subj-select');
  subjEl.innerHTML = '<option value="">Todos os assuntos</option>';
  const disc = state.disciplines.find(d => d.id === state.questionDiscipline);
  if (disc && disc.subjects) {
    disc.subjects.forEach(s => {
      subjEl.innerHTML += `<option value="${s.id}">${s.name}</option>`;
      if (s.children) {
        s.children.forEach(c => {
          subjEl.innerHTML += `<option value="${c.id}">  └ ${c.name}</option>`;
        });
      }
    });
  }

  await loadQuestionsList();
}

async function onSubjChange() {
  state.questionSubject = document.getElementById('q-subj-select').value;
  state.questionPage = 1;
  await loadQuestionsList();
}

function setFilter(filter) {
  state.questionFilter = filter;
  state.questionPage = 1;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.filter-btn').forEach(b => {
    if (b.textContent.includes(filter === 'all' ? 'Todas' : filter === 'unanswered' ? 'Não feitas' : filter === 'answered' ? 'Feitas' : filter === 'correct' ? 'Acertadas' : 'Erradas')) {
      b.classList.add('active');
    }
  });
  loadQuestionsList();
}

async function loadQuestionsList() {
  const container = document.getElementById('questions-list-container');
  if (!container) return;

  const params = new URLSearchParams({
    page: state.questionPage,
    limit: 20,
    filter: state.questionFilter,
  });
  if (state.questionDiscipline) params.set('discipline', state.questionDiscipline);
  if (state.questionSubject)    params.set('subject', state.questionSubject);

  const data = await GET(`/questions?${params}`);
  const questions = data.questions || [];
  const pagination = data.pagination || {};

  state.questionTotal = pagination.total || 0;

  if (questions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-title">Nenhuma questão encontrada</div>
        <div class="empty-text">Tente mudar os filtros ou importe questões primeiro.</div>
        <button class="btn btn-primary" onclick="navigate('import')">⬇️ Importar Questões</button>
      </div>
    `;
    return;
  }

  const statusIcon = (q) => {
    if (!q.answered_at) return { cls: 'unanswered', icon: '⚪', label: 'Não feita' };
    if (q.user_correct == 1) return { cls: 'correct', icon: '🟢', label: 'Acertou' };
    return { cls: 'incorrect', icon: '🔴', label: 'Errou' };
  };

  container.innerHTML = `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">${pagination.total?.toLocaleString('pt-BR')} questões encontradas</div>
    <div class="questions-grid">
      ${questions.map(q => {
        const s = statusIcon(q);
        const preview = stripHtml(q.statement_preview || '').substring(0, 150);
        return `
          <div class="question-card" onclick="loadQuizAndNavigate('${q.id}')">
            <div class="status-dot ${s.cls}"></div>
            <div style="flex:1;min-width:0">
              <div class="q-meta">
                ${q.discipline_name ? `<span style="color:${q.discipline_color||'#6366f1'};font-weight:600">${q.discipline_name}</span> · ` : ''}
                ${q.subject_name ? q.subject_name + ' · ' : ''}
                ${q.year ? q.year + ' · ' : ''}
                ${q.institute ? q.institute : ''}
              </div>
              <div class="q-preview">${preview || '(sem enunciado)'}</div>
              <div class="q-badges">
                <span class="badge ${s.cls === 'unanswered' ? 'badge-muted' : s.cls === 'correct' ? 'badge-green' : 'badge-red'}">${s.icon} ${s.label}</span>
                ${q.has_images ? '<span class="badge badge-accent">📷 Com imagem</span>' : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${renderPagination(pagination)}
  `;
}

function renderPagination(pagination) {
  if (pagination.pages <= 1) return '';
  const { page, pages } = pagination;
  let buttons = '';

  const makeBtn = (p, label, cls = '') =>
    `<button class="page-btn ${cls}" onclick="goToPage(${p})">${label}</button>`;

  if (page > 1) buttons += makeBtn(page - 1, '‹');

  const start = Math.max(1, page - 2);
  const end   = Math.min(pages, page + 2);
  if (start > 1) buttons += makeBtn(1, '1') + (start > 2 ? '<span class="page-info">…</span>' : '');

  for (let i = start; i <= end; i++) {
    buttons += makeBtn(i, i, i === page ? 'active' : '');
  }

  if (end < pages) buttons += (end < pages - 1 ? '<span class="page-info">…</span>' : '') + makeBtn(pages, pages);
  if (page < pages) buttons += makeBtn(page + 1, '›');

  return `<div class="pagination">${buttons}</div>`;
}

function goToPage(p) {
  state.questionPage = p;
  loadQuestionsList();
  document.getElementById('questions-content').scrollIntoView({ behavior: 'smooth' });
}

async function loadQuizAndNavigate(questionId) {
  await loadQuiz(questionId);
  navigate('quiz');
}
