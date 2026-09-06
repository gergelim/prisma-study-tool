const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/db');

// GET /api/progress — get progress stats per discipline
router.get('/', (req, res) => {
  const db = getDb();

  const disciplines = db.prepare('SELECT * FROM disciplines ORDER BY name').all();

  const result = disciplines.map(disc => {
    const total = db.prepare('SELECT COUNT(*) as c FROM questions WHERE discipline_id = ?').get(disc.id)?.c || 0;

    const answered = db.prepare(`
      SELECT COUNT(DISTINCT ua.question_id) as c
      FROM user_answers ua
      JOIN questions q ON q.id = ua.question_id
      WHERE q.discipline_id = ?
    `).get(disc.id)?.c || 0;

    const correct = db.prepare(`
      SELECT COUNT(DISTINCT ua.question_id) as c
      FROM user_answers ua
      JOIN questions q ON q.id = ua.question_id
      WHERE q.discipline_id = ? AND ua.is_correct = 1
      AND ua.id IN (SELECT MAX(id) FROM user_answers GROUP BY question_id)
    `).get(disc.id)?.c || 0;

    const incorrect = answered - correct;
    const unanswered = total - answered;
    const completionPct = total > 0 ? Math.round((answered / total) * 100 * 10) / 10 : 0;
    const correctPct = answered > 0 ? Math.round((correct / answered) * 100 * 10) / 10 : 0;

    return {
      discipline: disc,
      stats: {
        total,
        answered,
        unanswered,
        correct,
        incorrect,
        completionPct,
        correctPct
      }
    };
  });

  res.json({ progress: result });
});

// GET /api/dashboard — aggregated dashboard stats
router.get('/dashboard', (req, res) => {
  const db = getDb();

  const totalQuestions = db.prepare('SELECT COUNT(*) as c FROM questions').get()?.c || 0;
  const totalDisciplines = db.prepare('SELECT COUNT(*) as c FROM disciplines').get()?.c || 0;
  const totalAnswered = db.prepare('SELECT COUNT(DISTINCT question_id) as c FROM user_answers').get()?.c || 0;
  const totalCorrect = db.prepare(`
    SELECT COUNT(DISTINCT question_id) as c FROM user_answers
    WHERE is_correct = 1
    AND id IN (SELECT MAX(id) FROM user_answers GROUP BY question_id)
  `).get()?.c || 0;
  const totalIncorrect = totalAnswered - totalCorrect;
  const totalUnanswered = totalQuestions - totalAnswered;
  const overallPct = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100 * 10) / 10 : 0;
  const correctPct = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100 * 10) / 10 : 0;

  res.json({
    dashboard: {
      totalQuestions,
      totalDisciplines,
      totalAnswered,
      totalUnanswered,
      totalCorrect,
      totalIncorrect,
      overallPct,
      correctPct
    }
  });
});

module.exports = router;
