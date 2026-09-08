const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static files ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Initialize database on startup ───────────────────────────
getDb();

// ── API Routes ────────────────────────────────────────────────
app.use('/api/subjects',   require('./api/routes/subjects'));
app.use('/api/questions',  require('./api/routes/questions'));
app.use('/api/import',     require('./api/routes/import'));
app.use('/api/progress',   require('./api/routes/progress'));
app.use('/api/ai',         require('./api/routes/ai'));

// ── SPA fallback ──────────────────────────────────────────────
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/images')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start server ──────────────────────────────────────────────
app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log('');
  console.log('  ╔══════════════════════════════════════════╗');
  console.log('  ║       🎯  Prisma Study Tool v1.0         ║');
  console.log('  ╠══════════════════════════════════════════╣');
  console.log(`  ║  ► Acesse: ${url.padEnd(31)}║`);
  console.log('  ╠══════════════════════════════════════════╣');
  console.log('  ║  Pressione Ctrl+C para encerrar          ║');
  console.log('  ╚══════════════════════════════════════════╝');
  console.log('');
  console.log('  💡 Dica: Acesse a aplicação e clique em');
  console.log('     "Sincronizar Matérias" para começar.');
  console.log('');
});

module.exports = app;
