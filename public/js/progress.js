// ── PROGRESS PAGE ─────────────────────────────────────────────
async function renderProgress() {
  const el = document.getElementById('progress-content');
  el.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Carregando progresso...</span></div>`;

  const data = await GET('/progress');
  const progress = data.progress || [];

  if (progress.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <div class="empty-title">Sem dados de progresso</div>
        <div class="empty-text">Importe questões e comece a responder para ver seu progresso.</div>
        <button class="btn btn-primary" onclick="navigate('import')">⬇️ Importar Questões</button>
      </div>
    `;
    return;
  }

  // Filter only disciplines with questions
  const withQuestions = progress.filter(p => p.stats.total > 0);

  // Overall totals
  const totals = withQuestions.reduce((acc, p) => ({
    total:     acc.total + p.stats.total,
    answered:  acc.answered + p.stats.answered,
    correct:   acc.correct + p.stats.correct,
    incorrect: acc.incorrect + p.stats.incorrect,
  }), { total: 0, answered: 0, correct: 0, incorrect: 0 });

  const overallPct  = totals.total > 0 ? Math.round(totals.answered / totals.total * 100 * 10) / 10 : 0;
  const correctPct  = totals.answered > 0 ? Math.round(totals.correct / totals.answered * 100 * 10) / 10 : 0;

  el.innerHTML = `
    <!-- Overall Summary -->
    <div class="stats-grid mb-16">
      <div class="card">
        <div class="card-title">Total de Questões</div>
        <div class="card-value accent">${totals.total.toLocaleString('pt-BR')}</div>
      </div>
      <div class="card">
        <div class="card-title">Feitas</div>
        <div class="card-value">${totals.answered.toLocaleString('pt-BR')}</div>
        <div class="card-sub">${overallPct}% do total</div>
      </div>
      <div class="card">
        <div class="card-title">Acertos</div>
        <div class="card-value green">${totals.correct.toLocaleString('pt-BR')}</div>
        <div class="card-sub">${correctPct}% de aproveitamento</div>
      </div>
      <div class="card">
        <div class="card-title">Erros</div>
        <div class="card-value red">${totals.incorrect.toLocaleString('pt-BR')}</div>
      </div>
      <div class="card">
        <div class="card-title">Não Feitas</div>
        <div class="card-value yellow">${(totals.total - totals.answered).toLocaleString('pt-BR')}</div>
      </div>
    </div>

    <!-- Accuracy Ratio Bar -->
    ${totals.answered > 0 ? `
    <div class="mb-16">
      <div class="flex justify-between mb-8" style="font-size:12px;color:var(--text-muted)">
        <span>Taxa de Acerto: <strong class="text-green">${correctPct}%</strong> (${totals.correct} acertos)</span>
        <span>${totals.incorrect} erros</span>
      </div>
      <div class="progress-bar-wrap" style="height:10px">
        <div class="progress-bar-fill green" style="width:${correctPct}%;float:left;border-radius:0"></div>
        <div class="progress-bar-fill red" style="width:${(100-correctPct).toFixed(1)}%;float:left;background:var(--red)"></div>
      </div>
    </div>` : ''}

    <!-- Per Discipline -->
    <div class="section">
      <div class="section-header">
        <div class="section-title">📚 Por Matéria</div>
      </div>
      <div class="section-body" style="padding:12px 16px">
        ${withQuestions.length === 0
          ? '<div class="text-muted" style="font-size:13px;padding:16px 0">Nenhuma questão importada ainda.</div>'
          : withQuestions.map(p => renderDisciplineProgress(p)).join('')
        }
      </div>
    </div>
  `;
}

function renderDisciplineProgress(p) {
  const { discipline, stats } = p;
  const completionPct = stats.completionPct;
  const correctPct    = stats.correctPct;

  return `
    <div class="progress-discipline-card">
      <div class="pdc-header">
        <div class="pdc-name">
          <span style="width:10px;height:10px;border-radius:50%;background:${discipline.color||'#6366f1'};display:inline-block"></span>
          ${discipline.name}
        </div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" onclick="goToQuestions('${discipline.id}')">Ver questões</button>
          <button class="btn btn-primary btn-sm" onclick="startNextQuestionForDisc('${discipline.id}')">▶ Continuar</button>
        </div>
      </div>

      <div class="pdc-stats mb-16">
        <div class="stat">
          <span class="stat-label">Total</span>
          <span class="stat-value">${stats.total.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Feitas</span>
          <span class="stat-value" style="color:var(--accent-light)">${stats.answered.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Não feitas</span>
          <span class="stat-value" style="color:var(--yellow)">${stats.unanswered.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Acertos</span>
          <span class="stat-value" style="color:var(--green)">${stats.correct.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Erros</span>
          <span class="stat-value" style="color:var(--red)">${stats.incorrect.toLocaleString('pt-BR')}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Progresso</span>
          <span class="stat-value">${completionPct}%</span>
        </div>
        <div class="stat">
          <span class="stat-label">Aproveitamento</span>
          <span class="stat-value">${correctPct}%</span>
        </div>
      </div>

      <div style="display:grid;gap:4px">
        <div class="flex justify-between" style="font-size:11px;color:var(--text-muted)">
          <span>Progresso de conclusão</span>
          <span>${completionPct}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill" style="width:${completionPct}%"></div>
        </div>

        ${stats.answered > 0 ? `
        <div class="flex justify-between" style="font-size:11px;color:var(--text-muted);margin-top:4px">
          <span>Taxa de acerto</span>
          <span>${correctPct}%</span>
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar-fill green" style="width:${correctPct}%"></div>
        </div>` : ''}
      </div>
    </div>
  `;
}

async function startNextQuestionForDisc(disciplineId) {
  state.questionDiscipline = disciplineId;
  const data = await GET(`/questions/next-unanswered?discipline=${disciplineId}`);
  if (data.questionId) {
    await loadQuiz(data.questionId);
    navigate('quiz');
  } else {
    showToast('Todas as questões desta matéria foram respondidas!', 'info');
  }
}
