// ── AI STUDY ASSISTANT (✦ IA) ──────────────────────────────────
const aiState = {
  isOpen: false,
  conversationId: localStorage.getItem('know_ai_conv_id') || null,
  isLoading: false,
};

function toggleAIPanel() {
  if (aiState.isOpen) {
    closeAIPanel();
  } else {
    openAIPanel();
  }
}

function openAIPanel() {
  const panel = document.getElementById('ai-panel');
  const btn = document.getElementById('ai-toggle-btn');
  const input = document.getElementById('ai-prompt-input');
  if (!panel || !btn) return;

  panel.classList.add('open');
  btn.classList.add('active');
  panel.setAttribute('aria-hidden', 'false');
  aiState.isOpen = true;

  if (input) {
    setTimeout(() => input.focus(), 80);
  }

  // Se já tiver uma conversa ativa salva, carregar o histórico
  if (aiState.conversationId) {
    loadAIHistory(aiState.conversationId);
  } else {
    renderAIEmptyState();
  }
}

function closeAIPanel() {
  const panel = document.getElementById('ai-panel');
  const btn = document.getElementById('ai-toggle-btn');
  if (!panel || !btn) return;

  panel.classList.remove('open');
  btn.classList.remove('active');
  panel.setAttribute('aria-hidden', 'true');
  aiState.isOpen = false;
}

function renderAIEmptyState() {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  container.innerHTML = `
    <div class="ai-empty-state">
      <div class="ai-empty-icon">✦</div>
      <div>Tire dúvidas sobre matérias, conceitos, fórmulas ou a questão em estudo.</div>
    </div>
  `;
}

async function loadAIHistory(convId) {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  container.innerHTML = `
    <div class="loading-overlay" style="padding:40px 0;">
      <div class="spinner"></div>
      <span>Carregando histórico...</span>
    </div>
  `;

  const data = await GET(`/ai/history/${convId}`);
  const messages = data.messages || [];

  if (messages.length === 0) {
    renderAIEmptyState();
    return;
  }

  container.innerHTML = '';
  messages.forEach(msg => {
    appendAIMessage(msg.role, msg.content, msg.created_at);
  });
  scrollAIMessagesToBottom();
}

async function startNewAIConversation() {
  if (aiState.isLoading) return;

  aiState.conversationId = null;
  localStorage.removeItem('know_ai_conv_id');

  const res = await POST('/ai/conversation/new', {});
  if (res.conversationId) {
    aiState.conversationId = res.conversationId;
    localStorage.setItem('know_ai_conv_id', res.conversationId);
  }

  renderAIEmptyState();
  const input = document.getElementById('ai-prompt-input');
  if (input) {
    input.value = '';
    input.focus();
  }

  showToast('Nova conversa iniciada', 'info');
}

function getEducationalContext() {
  const ctx = {
    page: state.currentPage || 'dashboard'
  };

  // Se estiver resolvendo uma questão no momento, enviar os dados dela
  if (state.currentPage === 'quiz' && quizState.question) {
    const q = quizState.question;
    ctx.disciplineName = q.discipline_name || '';
    ctx.subjectName = q.subject_name || '';
    ctx.statement = stripHtml(q.statement || '').slice(0, 450);
    ctx.correctAnswer = q.correct_answer || '';
    ctx.userAnswer = q.userAnswer?.selected_answer || '';
  } else if (state.questionDiscipline) {
    const disc = (state.disciplines || []).find(d => d.id === state.questionDiscipline);
    if (disc) ctx.disciplineName = disc.name;
  }

  return ctx;
}

async function sendAIMessage() {
  if (aiState.isLoading) return;

  const input = document.getElementById('ai-prompt-input');
  const sendBtn = document.getElementById('ai-send-btn');
  const text = (input?.value || '').trim();

  if (!text) return;
  if (text.length > 1000) {
    showToast('A mensagem não pode ter mais de 1000 caracteres.', 'error');
    return;
  }

  // Limpar estado vazio se for a primeira mensagem
  const container = document.getElementById('ai-messages');
  if (container?.querySelector('.ai-empty-state')) {
    container.innerHTML = '';
  }

  // Adicionar balão do usuário na tela
  appendAIMessage('user', text, new Date().toISOString());
  scrollAIMessagesToBottom();

  // Resetar campo
  input.value = '';
  input.style.height = 'auto';

  // Mostrar estado de carregamento
  aiState.isLoading = true;
  if (sendBtn) sendBtn.disabled = true;
  if (input) input.disabled = true;

  const loadingEl = document.createElement('div');
  loadingEl.className = 'ai-msg assistant';
  loadingEl.id = 'ai-active-loading';
  loadingEl.innerHTML = `
    <div class="ai-loading-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  container.appendChild(loadingEl);
  scrollAIMessagesToBottom();

  const context = getEducationalContext();

  const result = await POST('/ai/chat', {
    message: text,
    conversationId: aiState.conversationId,
    context
  });

  // Remover indicador de carregamento
  loadingEl.remove();
  aiState.isLoading = false;
  if (sendBtn) sendBtn.disabled = false;
  if (input) {
    input.disabled = false;
    input.focus();
  }

  if (result.error) {
    appendAIMessage('assistant', 'Não foi possível obter uma resposta. Tente novamente em instantes.');
  } else if (result.reply) {
    if (result.conversationId) {
      aiState.conversationId = result.conversationId;
      localStorage.setItem('know_ai_conv_id', result.conversationId);
    }
    appendAIMessage('assistant', result.reply, new Date().toISOString());
  }

  scrollAIMessagesToBottom();
}

function appendAIMessage(role, content, timestamp) {
  const container = document.getElementById('ai-messages');
  if (!container) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `ai-msg ${role}`;

  // Formatação segura de texto com quebra de linha e código/ênfase
  const formattedContent = formatAIMessageText(content);

  const timeStr = timestamp ? formatTime(timestamp) : '';

  msgDiv.innerHTML = `
    <div class="ai-msg-body">${formattedContent}</div>
    ${timeStr ? `<span class="ai-msg-time">${timeStr}</span>` : ''}
  `;

  container.appendChild(msgDiv);
}

function formatAIMessageText(text) {
  if (!text) return '';

  // Escapar HTML para evitar XSS
  let escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Suporte simples a blocos e trechos de código em markdown
  escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.15);padding:8px;border-radius:6px;font-size:12px;margin:6px 0;overflow-x:auto;"><code>$1</code></pre>');
  escaped = escaped.replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.12);padding:2px 4px;border-radius:4px;font-size:12px;">$1</code>');

  // Suporte a negrito
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Quebras de linha
  escaped = escaped.replace(/\n/g, '<br>');

  return escaped;
}

function formatTime(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function scrollAIMessagesToBottom() {
  const container = document.getElementById('ai-messages');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

// ── Inicialização de Listeners ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('ai-prompt-input');
  const panel = document.getElementById('ai-panel');
  const toggleBtn = document.getElementById('ai-toggle-btn');

  if (input) {
    input.addEventListener('keydown', (e) => {
      // Enter envia a pergunta, Shift + Enter quebra a linha
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendAIMessage();
      }
    });

    // Auto-ajuste de altura da textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 80) + 'px';
    });
  }

  // Fechar com tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && aiState.isOpen) {
      closeAIPanel();
    }
  });

  // Fechar ao clicar fora do painel e do botão de abertura
  document.addEventListener('click', (e) => {
    if (!aiState.isOpen || !panel || !toggleBtn) return;
    if (!panel.contains(e.target) && !toggleBtn.contains(e.target)) {
      closeAIPanel();
    }
  });
});
