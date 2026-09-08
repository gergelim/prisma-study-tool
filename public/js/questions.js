// ── QUESTIONS LIST PAGE ──────────────────────────────────────
async function renderQuestions() {
  const el = document.getElementById('questions-content');

  if (!state.disciplines || state.disciplines.length === 0) {
    await loadDisciplines();
  }

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
    <div class="flex gap-12 flex-wrap mb-16 items-center">
      <!-- Combobox Pesquisável de Matéria -->
      <div class="combobox-container" id="q-disc-combobox" style="min-width:220px;max-width:300px;">
        <div class="combobox-input-wrap">
          <span class="combobox-icon-search">🔎</span>
          <input type="text"
                 class="combobox-input"
                 id="q-disc-input"
                 placeholder="Todas as matérias..."
                 value="${selectedDisc ? selectedDisc.name : ''}"
                 autocomplete="off"
                 spellcheck="false">
          <button type="button"
                  class="combobox-clear-btn"
                  id="q-disc-clear"
                  style="${selectedDisc ? 'display:flex' : 'display:none'}"
                  title="Limpar filtro de matéria"
                  aria-label="Limpar">✕</button>
          <input type="hidden" id="q-disc-select" value="${state.questionDiscipline || ''}">
        </div>
        <div class="combobox-dropdown" id="q-disc-dropdown" role="listbox"></div>
      </div>

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

  initQuestionsDisciplineCombobox();
  await loadQuestionsList();
}

/**
 * Controla o combobox de matérias na página de listagem de questões.
 */
function initQuestionsDisciplineCombobox() {
  const container = document.getElementById('q-disc-combobox');
  const input = document.getElementById('q-disc-input');
  const hidden = document.getElementById('q-disc-select');
  const clearBtn = document.getElementById('q-disc-clear');
  const dropdown = document.getElementById('q-disc-dropdown');

  if (!container || !input || !hidden || !clearBtn || !dropdown) return;

  let activeIndex = -1;
  let currentItems = [];

  function norm(str) {
    return (str || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function highlight(fullText, query) {
    if (!query) return escapeHtml(fullText);
    const nFull = norm(fullText);
    const nQuery = norm(query);
    const idx = nFull.indexOf(nQuery);
    if (idx === -1) return escapeHtml(fullText);

    const before = fullText.substring(0, idx);
    const match = fullText.substring(idx, idx + query.length);
    const after = fullText.substring(idx + query.length);
    return `${escapeHtml(before)}<span class="combobox-match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
  }

  function escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function openDropdown() {
    renderDropdown();
    dropdown.classList.add('open');
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    activeIndex = -1;
  }

  function renderDropdown() {
    const query = input.value.trim();
    const normQuery = norm(query);
    dropdown.innerHTML = '';
    currentItems = [];

    const disciplines = state.disciplines || [];
    let filtered = [];

    if (!normQuery) {
      filtered = [...disciplines];
    } else {
      filtered = disciplines.filter(d => {
        return norm(d.name).includes(normQuery) || norm(d.slug).includes(normQuery);
      });
    }

    // Option: "Todas as matérias" at the top
    const allOption = document.createElement('div');
    allOption.className = 'combobox-item';
    if (!state.questionDiscipline) {
      allOption.classList.add('selected');
    }
    allOption.setAttribute('role', 'option');
    allOption.innerHTML = `<span>📋 <em>Todas as matérias</em></span>`;
    allOption.addEventListener('click', () => {
      selectDiscipline(null);
    });
    dropdown.appendChild(allOption);
    currentItems.push({ type: 'all', element: allOption });

    if (filtered.length > 0) {
      filtered.forEach(d => {
        const item = document.createElement('div');
        item.className = 'combobox-item';
        if (state.questionDiscipline === d.id) {
          item.classList.add('selected');
        }
        item.setAttribute('role', 'option');
        item.setAttribute('data-id', d.id);
        item.setAttribute('data-name', d.name);

        const countText = d.questionCount ? `${d.questionCount} questões` : '';
        item.innerHTML = `
          <span>${highlight(d.name, query)}</span>
          ${countText ? `<span class="combobox-item-count">${countText}</span>` : ''}
        `;

        item.addEventListener('click', () => {
          selectDiscipline(d);
        });

        dropdown.appendChild(item);
        currentItems.push({ type: 'disc', data: d, element: item });
      });
    } else if (query) {
      const empty = document.createElement('div');
      empty.className = 'combobox-empty';
      empty.textContent = `Nenhuma matéria encontrada para "${query}"`;
      dropdown.appendChild(empty);
    }

    activeIndex = -1;
    updateHighlight();
  }

  function updateHighlight() {
    currentItems.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.element.classList.add('highlighted');
        item.element.scrollIntoView({ block: 'nearest' });
      } else {
        item.element.classList.remove('highlighted');
      }
    });
  }

  function selectDiscipline(disc) {
    if (disc) {
      input.value = disc.name;
      hidden.value = disc.id;
      state.questionDiscipline = disc.id;
      clearBtn.style.display = 'flex';
    } else {
      input.value = '';
      hidden.value = '';
      state.questionDiscipline = '';
      clearBtn.style.display = 'none';
    }

    state.questionSubject = '';
    state.questionPage = 1;
    closeDropdown();

    // Update subjects dropdown
    updateSubjectsDropdown();
    loadQuestionsList();
  }

  function updateSubjectsDropdown() {
    const subjEl = document.getElementById('q-subj-select');
    if (!subjEl) return;
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
  }

  // Events
  input.addEventListener('focus', () => {
    openDropdown();
  });

  input.addEventListener('input', () => {
    clearBtn.style.display = input.value ? 'flex' : 'none';
    if (!input.value) {
      state.questionDiscipline = '';
      hidden.value = '';
      state.questionSubject = '';
      state.questionPage = 1;
      updateSubjectsDropdown();
      loadQuestionsList();
    }
    openDropdown();
  });

  input.addEventListener('keydown', (e) => {
    if (!dropdown.classList.contains('open')) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        openDropdown();
        e.preventDefault();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentItems.length > 0) {
        activeIndex = (activeIndex + 1) % currentItems.length;
        updateHighlight();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentItems.length > 0) {
        activeIndex = (activeIndex - 1 + currentItems.length) % currentItems.length;
        updateHighlight();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && currentItems[activeIndex]) {
        const item = currentItems[activeIndex];
        if (item.type === 'all') {
          selectDiscipline(null);
        } else if (item.type === 'disc') {
          selectDiscipline(item.data);
        }
      } else if (currentItems.length > 0) {
        // Select first matching discipline
        const first = currentItems.find(i => i.type === 'disc');
        if (first) {
          selectDiscipline(first.data);
        }
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  });

  clearBtn.addEventListener('click', () => {
    selectDiscipline(null);
    input.focus();
    openDropdown();
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      closeDropdown();
    }
  });
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
