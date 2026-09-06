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

module.exports = router;
