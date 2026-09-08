const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../../database/db');

// ── Carregamento seguro do .env sem dependências externas ────
function loadEnv() {
  try {
    const envPath = path.resolve(__dirname, '../../.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const key = trimmed.slice(0, eqIdx).trim();
            const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
            process.env[key] = val;
          }
        }
      });
    }
  } catch (err) {
    console.warn('[AI] Aviso ao carregar .env:', err.message);
  }
}
loadEnv();

const SYSTEM_PROMPT = `Você é o Assistente de Estudos da plataforma "know".
Sua missão é ajudar estudantes com dúvidas acadêmicas, matérias escolares e questões de vestibular (Matemática, Física, Química, Biologia, História, Geografia, Português, Literatura, Filosofia, etc.).

DIRETRIZES FUNDAMENTAIS:
1. ESCOPO: Se o usuário perguntar algo que não seja educacional ou acadêmico (ex.: recomendações de lazer, restaurantes, compras, amenidades), responda estritamente: "Posso ajudar com dúvidas relacionadas aos seus estudos e ao conteúdo da plataforma."
2. OBJETIVIDADE E CLAREZA: Vá direto ao ponto. Use a estrutura: Resposta direta → Explicação clara → Exemplo/passo a passo (quando necessário).
3. SEM SAUDAÇÕES ARTIFICIAIS: Não use frases como "Claro! Que ótima pergunta!" ou "Estou aqui para te ajudar!". Inicie diretamente com o conteúdo da resposta.
4. CONTEXTO DE QUESTÃO: Se houver dados de uma questão da plataforma no contexto (enunciado, alternativas ou matéria), utilize-os para fundamentar a explicação didática.`;

// ── POST /api/ai/chat — Envia mensagem para a IA ─────────────
router.post('/chat', async (req, res) => {
  const { message, conversationId, context } = req.body;

  // Validação: apenas texto permitido
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'A mensagem deve conter texto válido.' });
  }

  const userText = message.trim();
  if (userText.length > 1000) {
    return res.status(400).json({ error: 'A pergunta excede o limite de 1000 caracteres.' });
  }

  const db = getDb();
  let convId = conversationId;

  // Criar conversa se não existir
  if (!convId) {
    convId = uuidv4();
    db.prepare(`
      INSERT INTO ai_conversations (id, title, created_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
    `).run(convId, userText.slice(0, 45));
  } else {
    const existing = db.prepare('SELECT id FROM ai_conversations WHERE id = ?').get(convId);
    if (!existing) {
      db.prepare(`
        INSERT INTO ai_conversations (id, title, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `).run(convId, userText.slice(0, 45));
    }
  }

  // Salvar mensagem do usuário
  const userMsgId = uuidv4();
  db.prepare(`
    INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, 'user', ?, datetime('now'))
  `).run(userMsgId, convId, userText);

  // Recarregar variáveis de ambiente caso tenham sido alteradas recentemente
  loadEnv();
  const apiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY;

  if (!apiKey) {
    const notice = 'Para ativar o Assistente de IA, configure a chave GEMINI_API_KEY no arquivo .env do servidor.';
    // Salvar aviso para manter coerência
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).run(uuidv4(), convId, notice);

    return res.json({
      success: true,
      conversationId: convId,
      reply: notice,
      isConfigNotice: true
    });
  }

  try {
    // Buscar histórico recente (últimas 6 mensagens) para contexto contínuo
    const recentMessages = db.prepare(`
      SELECT role, content FROM ai_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
      LIMIT 8
    `).all(convId);

    // Montar contexto educacional se houver
    let contextBlock = '';
    if (context && typeof context === 'object') {
      const parts = [];
      if (context.disciplineName) parts.push(`Matéria: ${context.disciplineName}`);
      if (context.subjectName) parts.push(`Assunto: ${context.subjectName}`);
      if (context.statement) parts.push(`Enunciado da questão em estudo: ${context.statement.slice(0, 450)}`);
      if (context.correctAnswer) parts.push(`Gabarito: ${context.correctAnswer}`);
      if (context.userAnswer) parts.push(`Resposta marcada pelo aluno: ${context.userAnswer}`);
      if (parts.length > 0) {
        contextBlock = `\n[CONTEXTO ATUAL DA PLATAFORMA:\n${parts.join('\n')}]\n`;
      }
    }

    // Estruturar mensagens para a API Gemini
    const contents = [
      {
        role: 'user',
        parts: [{ text: `${SYSTEM_PROMPT}\n${contextBlock}\nPor favor, responda à seguinte pergunta:` }]
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido. Responderei com foco educacional, de forma direta, clara e objetiva.' }]
      }
    ];

    for (const msg of recentMessages) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      });
    }

    const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    // Chamada à API Gemini com timeout e limite de tokens
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        contents,
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.3
        }
      },
      {
        timeout: 25000,
        headers: { 'Content-Type': 'application/json' }
      }
    );

    const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      || 'Não foi possível obter uma resposta adequada. Tente novamente.';

    // Salvar resposta da IA no banco
    const assistantMsgId = uuidv4();
    db.prepare(`
      INSERT INTO ai_messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, 'assistant', ?, datetime('now'))
    `).run(assistantMsgId, convId, reply);

    // Atualizar data da conversa
    db.prepare(`UPDATE ai_conversations SET updated_at = datetime('now') WHERE id = ?`).run(convId);

    return res.json({
      success: true,
      conversationId: convId,
      reply
    });

  } catch (err) {
    console.error('[AI] Erro ao chamar API:', err.response?.data || err.message);

    const errorMessage = 'Não foi possível obter uma resposta. Tente novamente em instantes.';
    return res.status(500).json({
      error: errorMessage
    });
  }
});

// ── GET /api/ai/history/:conversationId — Recupera histórico ─
router.get('/history/:conversationId', (req, res) => {
  const { conversationId } = req.params;
  const db = getDb();

  const messages = db.prepare(`
    SELECT id, role, content, created_at
    FROM ai_messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `).all(conversationId);

  res.json({ messages });
});

// ── POST /api/ai/conversation/new — Cria nova conversa ───────
router.post('/conversation/new', (req, res) => {
  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO ai_conversations (id, title, created_at, updated_at)
    VALUES (?, 'Nova Conversa', datetime('now'), datetime('now'))
  `).run(id);

  res.json({ conversationId: id });
});

module.exports = router;
