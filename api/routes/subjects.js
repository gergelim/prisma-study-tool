const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/db');
const { syncDisciplines } = require('../../scraper/index');

// GET /api/subjects — list all disciplines and their subjects
router.get('/', async (req, res) => {
  const db = getDb();
  try {
    const disciplines = db.prepare('SELECT * FROM disciplines ORDER BY name').all();

    const result = disciplines.map(disc => {
      const subjects = db.prepare(`
        SELECT * FROM subjects
        WHERE discipline_id = ? AND parent_id IS NULL
        ORDER BY "order", name
      `).all(disc.id);

      const subjectsWithChildren = subjects.map(subj => {
        const children = db.prepare(`
          SELECT * FROM subjects WHERE parent_id = ? ORDER BY name
        `).all(subj.id);
        return { ...subj, children };
      });

      const questionCount = db.prepare('SELECT COUNT(*) as count FROM questions WHERE discipline_id = ?').get(disc.id);

      return {
        ...disc,
        subjects: subjectsWithChildren,
        questionCount: questionCount?.count || 0
      };
    });

    res.json({ disciplines: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects/sync — sync disciplines from remote API
router.post('/sync', async (req, res) => {
  try {
    const disciplines = await syncDisciplines();
    res.json({ success: true, count: disciplines.length, message: `${disciplines.length} disciplinas sincronizadas` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects/custom — create or get a custom discipline
router.post('/custom', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome da matéria é obrigatório' });
  }
  const db = getDb();
  const trimmed = name.trim();
  const slug = trimmed
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Check if already exists (case-insensitive)
  const existing = db.prepare('SELECT * FROM disciplines WHERE LOWER(name) = LOWER(?) OR slug = ?').get(trimmed, slug);
  if (existing) {
    return res.json({ discipline: existing, created: false });
  }

  const id = `custom:${Date.now()}`;
  const color = '#8CD3FF';
  db.prepare(`
    INSERT INTO disciplines (id, name, slug, color)
    VALUES (?, ?, ?, ?)
  `).run(id, trimmed, slug, color);

  const newDisc = {
    id,
    name: trimmed,
    slug,
    color,
    subjects: [],
    questionCount: 0
  };

  res.json({ discipline: newDisc, created: true });
});

module.exports = router;
