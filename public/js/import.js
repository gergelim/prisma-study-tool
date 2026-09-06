// ── IMPORT PAGE ──────────────────────────────────────────────
async function renderImport() {
  const el = document.getElementById('import-content');

  if (!state.disciplines || state.disciplines.length === 0) {
    await loadDisciplines();
  }

  // Build discipline select options
  const discOptions = state.disciplines.length > 0
    ? state.disciplines.map(d => `<option value="${d.id}">${d.name} (${d.questionCount || 0} questões locais)</option>`).join('')
    : '<option value="" disabled>Nenhuma disciplina — sincronize primeiro</option>';

  el.innerHTML = `
    <div class="import-panel">
      <!-- Left: Config -->
      <div>
        <div class="section">
          <div class="section-header">
            <div class="section-title">⚙️ Configurar Extração</div>
          </div>
          <div class="section-body">
            ${state.disciplines.length === 0 ? `
              <div style="background:var(--yellow-dim);border:1px solid rgba(245,158,11,0.3);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;font-size:13px;">
                ⚠️ Sincronize as disciplinas antes de importar.
              </div>
              <button class="btn btn-secondary btn-full" onclick="syncDisciplinesForImport()">
                🔄 Sincronizar Disciplinas
              </button>
            ` : ''}

            <div class="form-group">
              <label class="form-label">Matéria</label>
              <select class="form-control" id="import-disc" onchange="loadSubjectsForImport()">
                <option value="">Todas as matérias</option>
                ${discOptions}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Assunto (opcional)</label>
              <select class="form-control" id="import-subj">
                <option value="">Todos os assuntos</option>
              </select>
            </div>

            <button class="btn btn-primary btn-full btn-lg" id="import-btn" onclick="startImport()">
              ⬇️ Extrair Questões
            </button>
          </div>
        </div>

        <!-- Recent Jobs -->
        <div class="section mt-16" id="import-jobs-section">
          <div class="section-header">
            <div class="section-title">📋 Importações Recentes</div>
            <button class="btn btn-secondary btn-sm" onclick="loadRecentJobs()">↻ Atualizar</button>
          </div>
          <div class="section-body" id="import-jobs-list">
            <div class="text-muted" style="font-size:13px;">Carregando...</div>
          </div>
        </div>
      </div>

      <!-- Right: Progress -->
      <div>
        <div class="section" id="import-progress-section" style="display:none">
          <div class="section-header">
            <div class="section-title">⏳ Progresso da Extração</div>
            <span id="import-status-badge" class="badge badge-yellow">Em andamento</span>
          </div>
          <div class="section-body">
            <div class="import-progress-box">
              <div class="progress-line">
                <span class="text-muted">Questões encontradas</span>
                <span id="prog-found" style="font-weight:700;">0</span>
              </div>
              <div class="progress-line">
                <span class="text-muted">Novas salvas</span>
                <span id="prog-saved" class="text-green" style="font-weight:700;">0</span>
              </div>
              <div class="progress-line">
                <span class="text-muted">Já existiam</span>
                <span id="prog-skipped" class="text-muted" style="font-weight:700;">0</span>
              </div>
              <div class="progress-line">
                <span class="text-muted">Página atual</span>
                <span id="prog-page" style="font-weight:700;">—</span>
              </div>
            </div>

            <div id="prog-bar-wrap" class="progress-bar-wrap mt-16" style="height:8px;display:none">
              <div class="progress-bar-fill" id="prog-bar" style="width:0%"></div>
            </div>

            <div class="log-box" id="import-log">
              <p class="log-info">[Sistema] Aguardando extração...</p>
            </div>

            <div id="import-done-box" style="display:none;margin-top:16px">
              <div class="result-box correct">
                <div class="result-icon">✅</div>
                <div class="result-text">
                  <div class="result-title">Extração concluída!</div>
                  <div class="result-detail" id="import-done-summary"></div>
                </div>
              </div>
              <button class="btn btn-primary btn-full" onclick="navigate('questions')">
                📋 Ver questões importadas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadRecentJobs();
}

async function syncDisciplinesForImport() {
  showToast('Sincronizando...', 'info');
  const result = await POST('/subjects/sync');
  if (result.error) {
    showToast('Erro: ' + result.error, 'error');
  } else {
    showToast(result.message, 'success');
    await loadDisciplines();
    renderImport();
  }
}

async function loadSubjectsForImport() {
  const discId = document.getElementById('import-disc')?.value;
  const subjEl = document.getElementById('import-subj');
  if (!subjEl) return;

  subjEl.innerHTML = '<option value="">Todos os assuntos</option>';
  if (!discId) return;

  const disc = state.disciplines.find(d => d.id === discId);
  if (!disc || !disc.subjects) return;

  for (const subj of disc.subjects) {
    const opt = document.createElement('option');
    opt.value = subj.id;
    opt.textContent = subj.name;
    subjEl.appendChild(opt);

    if (subj.children && subj.children.length > 0) {
      for (const child of subj.children) {
        const copt = document.createElement('option');
        copt.value = child.id;
        copt.textContent = `  └ ${child.name}`;
        subjEl.appendChild(copt);
      }
    }
  }
}

async function startImport() {
  const discId = document.getElementById('import-disc')?.value || null;
  const subjId = document.getElementById('import-subj')?.value || null;

  if (!discId && !subjId) {
    showToast('Selecione pelo menos uma matéria', 'info');
  }

  const btn = document.getElementById('import-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Iniciando...'; }

  const result = await POST('/import', { disciplineId: discId, subjectId: subjId });

  if (result.error) {
    showToast('Erro: ' + result.error, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '⬇️ Extrair Questões'; }
    return;
  }

  state.importJobId = result.jobId;
  document.getElementById('import-progress-section').style.display = '';
  addLog('info', '[Sistema] Job iniciado: ' + result.jobId);
  addLog('info', '[Sistema] Extraindo questões em background...');

  // Start polling
  if (state.importInterval) clearInterval(state.importInterval);
  state.importInterval = setInterval(() => pollImportStatus(result.jobId), 1500);
}

async function pollImportStatus(jobId) {
  const data = await GET(`/import/${jobId}/status`);
  const job = data.job;
  if (!job) return;

  document.getElementById('prog-found').textContent = (job.total_found || 0).toLocaleString('pt-BR');
  document.getElementById('prog-saved').textContent = (job.total_saved || 0).toLocaleString('pt-BR');
  document.getElementById('prog-skipped').textContent = (job.total_skipped || 0).toLocaleString('pt-BR');
  document.getElementById('prog-page').textContent = job.current_page || '—';

  // Progress bar
  if (job.total_found > 0) {
    const pct = Math.round((job.total_saved + job.total_skipped) / job.total_found * 100);
    const barWrap = document.getElementById('prog-bar-wrap');
    if (barWrap) { barWrap.style.display = ''; }
    const bar = document.getElementById('prog-bar');
    if (bar) bar.style.width = pct + '%';
  }

  if (job.status === 'done') {
    clearInterval(state.importInterval);
    state.importInterval = null;

    const badge = document.getElementById('import-status-badge');
    if (badge) { badge.className = 'badge badge-green'; badge.textContent = 'Concluído'; }

    addLog('done', `[Concluído] ${job.total_found?.toLocaleString('pt-BR')} encontradas · ${job.total_saved?.toLocaleString('pt-BR')} novas · ${job.total_skipped?.toLocaleString('pt-BR')} já existiam`);

    const doneBox = document.getElementById('import-done-box');
    const doneSummary = document.getElementById('import-done-summary');
    if (doneBox) doneBox.style.display = '';
    if (doneSummary) doneSummary.textContent = `${job.total_found?.toLocaleString('pt-BR')} questões encontradas · ${job.total_saved?.toLocaleString('pt-BR')} novas adicionadas · ${job.total_skipped?.toLocaleString('pt-BR')} já existiam`;

    const btn = document.getElementById('import-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = '⬇️ Extrair Questões'; }

    showToast('Extração concluída com sucesso!', 'success');
    await loadDisciplines();
    loadRecentJobs();
  } else if (job.status === 'error') {
    clearInterval(state.importInterval);
    state.importInterval = null;
    const badge = document.getElementById('import-status-badge');
    if (badge) { badge.className = 'badge badge-red'; badge.textContent = 'Erro'; }
    addLog('error', '[Erro] ' + (job.error_message || 'Erro desconhecido'));

    const btn = document.getElementById('import-btn');
    if (btn) { btn.disabled = false; btn.innerHTML = '⬇️ Extrair Questões'; }
    showToast('Erro na extração: ' + job.error_message, 'error');
    loadRecentJobs();
  } else if (job.status === 'running') {
    addLog('info', `[Página ${job.current_page}] ${job.total_saved?.toLocaleString('pt-BR')} salvas...`);
  }
}

function addLog(type, text) {
  const logBox = document.getElementById('import-log');
  if (!logBox) return;
  const p = document.createElement('p');
  p.className = `log-${type}`;
  p.textContent = text;
  logBox.appendChild(p);
  logBox.scrollTop = logBox.scrollHeight;
}

async function loadRecentJobs() {
  const data = await GET('/import/jobs');
  const jobs = data.jobs || [];
  const el = document.getElementById('import-jobs-list');
  if (!el) return;

  if (jobs.length === 0) {
    el.innerHTML = '<div class="text-muted" style="font-size:13px;">Nenhuma importação realizada ainda.</div>';
    return;
  }

  el.innerHTML = jobs.map(j => {
    const statusMap = {
      pending: '<span class="badge badge-muted">Aguardando</span>',
      running: '<span class="badge badge-yellow">Em andamento</span>',
      done:    '<span class="badge badge-green">Concluído</span>',
      error:   '<span class="badge badge-red">Erro</span>'
    };

    // Job can be repaired if it failed with error or didn't finish all found questions
    const isError = j.status === 'error';
    const isIncomplete = (j.total_found > 0 && (j.total_saved + j.total_skipped) < j.total_found);
    const canRepair = (isError || isIncomplete) && j.status !== 'running';

    return `
      <div style="padding:12px 0;border-bottom:1px solid var(--border);font-size:12px;" id="job-card-${j.id}">
        <div class="flex justify-between items-center mb-8">
          <span style="font-weight:600;">${j.discipline_name || 'Todas'} ${j.subject_name ? '/ '+j.subject_name : ''}</span>
          <div class="flex items-center gap-8">
            ${statusMap[j.status] || ''}
            ${canRepair ? `
              <button class="btn btn-warning btn-sm" onclick="repairJob('${j.id}')" title="Retomar extração e baixar questões faltantes">
                🛠️ Reparar
              </button>
            ` : ''}
          </div>
        </div>
        <div class="flex gap-12" style="color:var(--text-muted)">
          <span>🔍 ${(j.total_found||0).toLocaleString('pt-BR')} encontradas</span>
          <span>✅ ${(j.total_saved||0).toLocaleString('pt-BR')} novas</span>
          <span>⏭ ${(j.total_skipped||0).toLocaleString('pt-BR')} existentes</span>
        </div>
        <div style="color:var(--text-muted);margin-top:4px;">${fmtDate(j.created_at)}</div>
        ${j.error_message ? `
          <div class="flex justify-between items-center mt-8" style="background:rgba(239,68,68,0.1);padding:7px 10px;border-radius:6px;border:1px solid rgba(239,68,68,0.25);">
            <div class="text-red" style="font-size:11.5px;line-height:1.4;">⚠️ ${j.error_message}</div>
            ${canRepair ? `
              <button class="btn btn-warning btn-sm" style="padding:3px 9px;font-size:11px;margin-left:8px;" onclick="repairJob('${j.id}')">
                🛠️ Reparar
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

async function repairJob(jobId) {
  showToast('Iniciando reparo da importação...', 'info');

  const result = await POST(`/import/${jobId}/repair`);
  if (result.error) {
    showToast('Erro ao reparar: ' + result.error, 'error');
    return;
  }

  showToast('Reparo iniciado em background!', 'success');
  state.importJobId = jobId;

  // Show and update progress section
  const progSec = document.getElementById('import-progress-section');
  if (progSec) progSec.style.display = '';

  const badge = document.getElementById('import-status-badge');
  if (badge) { badge.className = 'badge badge-yellow'; badge.textContent = 'Reparando...'; }

  const doneBox = document.getElementById('import-done-box');
  if (doneBox) doneBox.style.display = 'none';

  addLog('info', `[Reparo] Retomando importação para coletar questões faltantes...`);

  // Start polling progress
  if (state.importInterval) clearInterval(state.importInterval);
  state.importInterval = setInterval(() => pollImportStatus(jobId), 1500);

  await loadRecentJobs();
}
