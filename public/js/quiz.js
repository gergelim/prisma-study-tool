// ── QUIZ PAGE ─────────────────────────────────────────────────
let quizState = {
  question: null,
  selectedAnswer: null,
  answered: false,
};

/**
 * Sanitize raw HTML from the database: removes white-space:nowrap and other
 * inline styles that would prevent the statement from wrapping correctly.
 */
function sanitizeStatementHtml(html) {
  if (!html) return '';
  // Use a temporary DOM element to parse and clean the HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('[style]').forEach(el => {
    // Remove white-space:nowrap from inline styles
    let style = el.getAttribute('style') || '';
    style = style.replace(/white-space\s*:\s*nowrap\s*;?/gi, '');
    // Remove overflow:hidden and overflow-x:auto/scroll that can hide content
    style = style.replace(/overflow(-x|-y)?\s*:\s*(hidden|auto|scroll)\s*;?/gi, '');
    if (style.trim()) {
      el.setAttribute('style', style);
    } else {
      el.removeAttribute('style');
    }
  });
  return tmp.innerHTML;
}

async function loadQuiz(questionId) {
  const el = document.getElementById('quiz-content');
  if (el) {
    el.innerHTML = `<div class="loading-overlay"><div class="spinner"></div><span>Carregando questão...</span></div>`;
  }

  const data = await GET(`/questions/${questionId}`);
  if (data.error || !data.question) {
    if (el) el.innerHTML = `<div class="empty-state"><div class="empty-icon">❌</div><div class="empty-title">Questão não encontrada</div></div>`;
    return;
  }

  quizState.question = data.question;
  quizState.selectedAnswer = null;
  quizState.answered = !!data.question.userAnswer;

  renderQuiz();
}

function renderQuiz() {
  const el = document.getElementById('quiz-content');
  if (!el) return;
  const q = quizState.question;
  if (!q) return;

  const ua = q.userAnswer;
  const alreadyAnswered = !!ua;
  const isCorrect = ua ? ua.is_correct === 1 : false;

  // Breadcrumb
  const breadParts = [];
  if (q.discipline_name) breadParts.push(`<span style="color:var(--brand-blue-text);font-weight:600">${q.discipline_name}</span>`);
  if (q.parent_subject_name) breadParts.push(`<span>${q.parent_subject_name}</span>`);
  if (q.subject_name) breadParts.push(`<span>${q.subject_name}</span>`);

  el.innerHTML = `
    <div class="quiz-container">
      <!-- Nav -->
      <div class="quiz-nav">
        <div class="quiz-breadcrumb">${breadParts.join(' › ')}</div>
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" onclick="history.back()">← Voltar</button>
          <button class="btn btn-secondary btn-sm" onclick="goNextQuestion()">Próxima →</button>
        </div>
      </div>

      <!-- Meta info badges -->
      <div class="flex gap-8 mb-16" style="flex-wrap:wrap">
        ${q.institute ? `<span class="badge badge-muted">🏛 ${q.institute}</span>` : ''}
        ${q.year ? `<span class="badge badge-muted">📅 ${q.year}</span>` : ''}
        ${q.has_images ? `<span class="badge badge-accent">📷 Contém imagens</span>` : ''}
        ${alreadyAnswered
          ? (isCorrect
              ? `<span class="badge badge-green">🟢 Você acertou</span>`
              : `<span class="badge badge-red">🔴 Você errou</span>`)
          : `<span class="badge badge-muted">⚪ Não respondida</span>`
        }
      </div>

      <!-- Already answered notice -->
      ${alreadyAnswered ? `
        <div class="already-answered-box">
          <span style="font-size:20px">${isCorrect ? '✅' : '❌'}</span>
          <div>
            <strong>Questão já respondida</strong>
            <br><span style="color:var(--text-muted)">Sua resposta: <strong>${ua.selected_answer}</strong>
            ${!isCorrect && q.correct_answer ? ` · Gabarito: <strong style="color:var(--green-text)">${q.correct_answer}</strong>` : ''}
            · Resultado: <strong class="${isCorrect ? 'text-green' : 'text-red'}">${isCorrect ? '✓ Acertou' : '✗ Errou'}</strong></span>
          </div>
        </div>
        ${!isCorrect ? renderGoogleSearchGrabber() : ''}
      ` : ''}

      <!-- Statement -->
      <div class="quiz-statement-box">
        <div class="statement-header">
          <span class="statement-title">Enunciado</span>
        </div>
        <div class="quiz-statement" id="quiz-statement">${sanitizeStatementHtml(q.statement)}</div>
      </div>

      <!-- Alternatives -->
      <div class="alternatives-list" id="alternatives-list">
        ${(q.alternatives || []).map(alt => {
          let cls = '';
          if (alreadyAnswered) {
            if (alt.letter === q.correct_answer) cls = 'correct';
            else if (ua && alt.letter === ua.selected_answer && !isCorrect) cls = 'wrong';
          }
          return `
            <div class="alternative ${cls} ${alreadyAnswered ? 'disabled' : ''}" id="alt-${alt.letter}"
              onclick="${alreadyAnswered ? '' : `selectAlternative('${alt.letter}')`}">
              <div class="letter">${alt.letter}</div>
              <div class="alt-text">${alt.text || ''}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Actions -->
      <div class="quiz-actions" id="quiz-actions">
        ${alreadyAnswered ? `
          <button class="btn btn-secondary" onclick="goNextQuestion()">Próxima questão →</button>
          <button class="btn btn-secondary" onclick="navigate('questions')">📋 Lista de questões</button>
        ` : `
          <button class="btn btn-primary btn-lg" id="btn-answer" onclick="submitAnswer()" disabled>
            ✓ Responder
          </button>
          <button class="btn btn-secondary" onclick="navigate('questions')">← Voltar à lista</button>
        `}
      </div>

      <!-- Result (shown after answering) -->
      <div id="quiz-result"></div>

      <!-- Explanation -->
      ${alreadyAnswered && q.explanation ? `
        <div class="explanation-box">
          <div class="exp-title">💡 Comentário do Professor</div>
          <div class="exp-body">${q.explanation}</div>
        </div>
      ` : '<div id="quiz-explanation"></div>'}
    </div>
  `;

  // Make images clickable (open in zoom modal or tab)
  el.querySelectorAll('img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => {
      if (typeof openImgZoom === 'function') {
        openImgZoom(img.src);
      } else {
        window.open(img.src, '_blank');
      }
    });
  });
}

function selectAlternative(letter) {
  if (quizState.answered) return;

  quizState.selectedAnswer = letter;

  document.querySelectorAll('.alternative').forEach(el => el.classList.remove('selected'));
  const altEl = document.getElementById(`alt-${letter}`);
  if (altEl) altEl.classList.add('selected');

  const btn = document.getElementById('btn-answer');
  if (btn) btn.disabled = false;
}

async function submitAnswer() {
  if (!quizState.selectedAnswer || !quizState.question) return;

  const btn = document.getElementById('btn-answer');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }

  const result = await POST(`/questions/${quizState.question.id}/answer`, {
    selectedAnswer: quizState.selectedAnswer
  });

  if (result.error) {
    showToast('Erro ao registrar resposta: ' + result.error, 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '✓ Responder'; }
    return;
  }

  quizState.answered = true;

  // Mark alternatives
  document.querySelectorAll('.alternative').forEach(el => {
    el.classList.add('disabled');
    el.onclick = null;
  });

  const correctEl = document.getElementById(`alt-${result.correctAnswer}`);
  if (correctEl) correctEl.classList.add('correct');

  if (!result.isCorrect) {
    const wrongEl = document.getElementById(`alt-${result.selectedAnswer}`);
    if (wrongEl) { wrongEl.classList.remove('selected'); wrongEl.classList.add('wrong'); }
  }

  // Show result
  const resultEl = document.getElementById('quiz-result');
  if (resultEl) {
    resultEl.innerHTML = result.isCorrect
      ? `<div class="result-box correct">
           <div class="result-icon">🎉</div>
           <div class="result-text">
             <div class="result-title">Correto! Você acertou!</div>
             <div class="result-detail">Alternativa <strong>${result.correctAnswer}</strong></div>
           </div>
         </div>`
      : `<div class="result-box incorrect">
           <div class="result-icon">😔</div>
           <div class="result-text">
             <div class="result-title">Incorreto! Você errou.</div>
             <div class="result-detail">Sua resposta: <strong>${result.selectedAnswer}</strong> · Gabarito: <strong>${result.correctAnswer}</strong></div>
           </div>
         </div>
         ${renderGoogleSearchGrabber()}`;
  }

  // Show explanation if available
  const explEl = document.getElementById('quiz-explanation');
  if (explEl && quizState.question.explanation) {
    explEl.innerHTML = `
      <div class="explanation-box">
        <div class="exp-title">💡 Comentário do Professor</div>
        <div class="exp-body">${quizState.question.explanation}</div>
      </div>
    `;
  }

  // Update actions
  const actionsEl = document.getElementById('quiz-actions');
  if (actionsEl) {
    actionsEl.innerHTML = `
      <button class="btn btn-primary" onclick="goNextQuestion()">Próxima questão →</button>
      <button class="btn btn-secondary" onclick="navigate('questions')">📋 Lista</button>
    `;
  }

  if (btn) btn.remove();
  showToast(result.isCorrect ? '✅ Acertou!' : '❌ Errou!', result.isCorrect ? 'success' : 'error');
}

async function goNextQuestion() {
  const params = new URLSearchParams();
  if (state.questionDiscipline) params.set('discipline', state.questionDiscipline);
  if (state.questionSubject)    params.set('subject', state.questionSubject);

  const data = await GET(`/questions/next-unanswered?${params}`);
  if (data.questionId) {
    await loadQuiz(data.questionId);
    window.scrollTo(0, 0);
  } else {
    showToast('🎉 Parabéns! Todas as questões foram respondidas!', 'success');
    navigate('progress');
  }
}

// ── Google Search Grabber Helper ─────────────────────────────
function renderGoogleSearchGrabber() {
  return `
    <div class="google-grabber-card">
      <div class="google-grabber-info">
        <div class="google-grabber-icon">🔍</div>
        <div class="google-grabber-text">
          <strong>Errou a questão? Pesquise a resolução!</strong>
          Consulte explicações completas e resoluções comentadas no Google.
        </div>
      </div>
      <button class="btn-google-search" onclick="searchQuestionOnGoogle()" title="Pesquisar enunciado no Google">
        <svg width="18" height="18" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:4px;">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Pesquisar no Google
      </button>
    </div>
  `;
}

function searchQuestionOnGoogle() {
  const q = quizState.question;
  if (!q) return;

  const prefix = [q.institute, q.year].filter(Boolean).join(' ');
  let text = stripHtml(q.statement || '');
  text = text.replace(/\s+/g, ' ').trim();
  const queryStr = (prefix ? prefix + ' ' : '') + text.substring(0, 220);

  const googleUrl = 'https://www.google.com/search?q=' + encodeURIComponent(queryStr);

  if (window.Capacitor) {
    window.open(googleUrl, '_system');
  } else {
    window.open(googleUrl, '_blank', 'noopener,noreferrer');
  }
}

