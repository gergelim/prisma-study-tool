function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS disciplines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      discipline_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      "order" INTEGER DEFAULT 0,
      FOREIGN KEY (discipline_id) REFERENCES disciplines(id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      original_id TEXT UNIQUE,
      original_url TEXT,
      discipline_id TEXT,
      subject_id TEXT,
      institute TEXT,
      year INTEGER,
      statement TEXT NOT NULL,
      alternatives TEXT NOT NULL,
      correct_answer TEXT,
      explanation TEXT,
      has_images INTEGER DEFAULT 0,
      imported_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (discipline_id) REFERENCES disciplines(id)
    );

    CREATE TABLE IF NOT EXISTS question_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      original_url TEXT NOT NULL,
      local_path TEXT,
      alt_text TEXT,
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS user_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id TEXT NOT NULL,
      selected_answer TEXT NOT NULL,
      is_correct INTEGER NOT NULL,
      answered_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (question_id) REFERENCES questions(id)
    );

    CREATE TABLE IF NOT EXISTS import_jobs (
      id TEXT PRIMARY KEY,
      discipline_id TEXT,
      subject_id TEXT,
      status TEXT DEFAULT 'pending',
      total_found INTEGER DEFAULT 0,
      total_saved INTEGER DEFAULT 0,
      total_skipped INTEGER DEFAULT 0,
      current_page INTEGER DEFAULT 0,
      error_message TEXT,
      started_at TEXT,
      finished_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_questions_discipline ON questions(discipline_id);
    CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_user_answers_question ON user_answers(question_id);

    CREATE TABLE IF NOT EXISTS ai_conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);
  `);

  seedInitialData(db);
}

function seedInitialData(db) {
  try {
    const path = require('path');
    const fs = require('fs');
    const row = db.prepare('SELECT COUNT(*) as count FROM disciplines').get();
    if (row && row.count > 0) return;

    const seedPath = path.join(__dirname, 'seed-data.json');
    if (!fs.existsSync(seedPath)) return;

    const raw = fs.readFileSync(seedPath, 'utf8');
    const data = JSON.parse(raw);

    const insertDisc = db.prepare(`
      INSERT OR REPLACE INTO disciplines (id, name, slug, color)
      VALUES (?, ?, ?, ?)
    `);

    const insertSubj = db.prepare(`
      INSERT OR REPLACE INTO subjects (id, discipline_id, parent_id, name, slug, "order")
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const seedTransaction = db.transaction(() => {
      if (Array.isArray(data.disciplines)) {
        for (const d of data.disciplines) {
          insertDisc.run(d.id, d.name, d.slug, d.color || '#6366f1');
        }
      }
      if (Array.isArray(data.subjects)) {
        for (const s of data.subjects) {
          insertSubj.run(s.id, s.discipline_id, s.parent_id || null, s.name, s.slug, s.order || 0);
        }
      }
    });

    seedTransaction();
    console.log(`[Database] Banco de dados semeado com ${data.disciplines?.length || 0} disciplinas e ${data.subjects?.length || 0} assuntos.`);
  } catch (err) {
    console.warn('[Database] Não foi possível carregar seed inicial:', err.message);
  }
}

module.exports = { runMigrations };
