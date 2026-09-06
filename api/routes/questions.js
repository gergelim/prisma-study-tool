const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/db');

// GET /api/questions — list questions with filters and pagination
router.get('/', (req, res) => {
  const db = getDb();
  const {
    discipline,
    subject,
    filter, // all|unanswered|answered|correct|incorrect
    page = 1,
    limit = 20
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);

  let whereClause = [];
  let params = [];

  if (discipline) {
    whereClause.push('q.discipline_id = ?');
    params.push(discipline);
  }

  if (subject) {
    whereClause.push('q.subject_id = ?');
    params.push(subject);
  }

  // Filter by answer status
  if (filter === 'unanswered') {
    whereClause.push(`q.id NOT IN (SELECT DISTINCT question_id FROM user_answers)`);
  } else if (filter === 'answered') {
    whereClause.push(`q.id IN (SELECT DISTINCT question_id FROM user_answers)`);
  } else if (filter === 'correct') {
    whereClause.push(`q.id IN (SELECT DISTINCT question_id FROM user_answers WHERE is_correct = 1)`);
  } else if (filter === 'incorrect') {
    whereClause.push(`q.id IN (SELECT DISTINCT question_id FROM user_answers WHERE is_correct = 0)`);
    whereClause.push(`q.id NOT IN (SELECT DISTINCT question_id FROM user_answers WHERE is_correct = 1)`);
  }

  const where = whereClause.length > 0 ? `WHERE ${whereClause.join(' AND ')}` : '';

  const countSql = `SELECT COUNT(*) as total FROM questions q ${where}`;
  const total = db.prepare(countSql).get(...params)?.total || 0;

  const sql = `
    SELECT
      q.id, q.original_id, q.discipline_id, q.subject_id,
      q.institute, q.year, q.has_images, q.imported_at,
      SUBSTR(q.statement, 1, 200) as statement_preview,
      d.name as discipline_name, d.slug as discipline_slug, d.color as discipline_color,
      s.name as subject_name,
      ua.selected_answer as user_answer,
      ua.is_correct as user_correct,
      ua.answered_at
    FROM questions q
    LEFT JOIN disciplines d ON d.id = q.discipline_id
    LEFT JOIN subjects s ON s.id = q.subject_id
    LEFT JOIN (
      SELECT question_id, selected_answer, is_correct, answered_at
      FROM user_answers
      WHERE id IN (SELECT MAX(id) FROM user_answers GROUP BY question_id)
    ) ua ON ua.question_id = q.id
    ${where}
    ORDER BY q.imported_at DESC
    LIMIT ? OFFSET ?
  `;

  const questions = db.prepare(sql).all(...params, parseInt(limit), offset);

  res.json({
    questions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// GET /api/questions/next-unanswered — get next question not yet answered
router.get('/next-unanswered', (req, res) => {
  const db = getDb();
  const { discipline, subject } = req.query;

  let whereClause = [`q.id NOT IN (SELECT DISTINCT question_id FROM user_answers)`];
  let params = [];

  if (discipline) {
    whereClause.push('q.discipline_id = ?');
    params.push(discipline);
  }

  if (subject) {
    whereClause.push('q.subject_id = ?');
    params.push(subject);
  }

  const question = db.prepare(`
    SELECT q.id FROM questions q
    WHERE ${whereClause.join(' AND ')}
    ORDER BY q.imported_at ASC
    LIMIT 1
  `).get(...params);

  if (!question) {
    return res.json({ question: null, message: 'Nenhuma questão não feita encontrada' });
  }

  res.json({ questionId: question.id });
});

// GET /api/questions/:id — get full question details
router.get('/:id', (req, res) => {
  const db = getDb();
  const question = db.prepare(`
    SELECT
      q.*,
      d.name as discipline_name, d.slug as discipline_slug, d.color as discipline_color,
      s.name as subject_name, s.slug as subject_slug,
      sp.name as parent_subject_name
    FROM questions q
    LEFT JOIN disciplines d ON d.id = q.discipline_id
    LEFT JOIN subjects s ON s.id = q.subject_id
    LEFT JOIN subjects sp ON sp.id = s.parent_id
    WHERE q.id = ?
  `).get(req.params.id);

  if (!question) {
    return res.status(404).json({ error: 'Questão não encontrada' });
  }

  // Parse alternatives JSON
  try {
    question.alternatives = JSON.parse(question.alternatives);
  } catch (e) {
    question.alternatives = [];
  }

  // Get images
  const images = db.prepare('SELECT * FROM question_images WHERE question_id = ?').all(req.params.id);
  question.images = images;

  // Get latest user answer
  const userAnswer = db.prepare(`
    SELECT * FROM user_answers
    WHERE question_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(req.params.id);
  question.userAnswer = userAnswer || null;

  res.json({ question });
});

// POST /api/questions/:id/answer — record user answer
router.post('/:id/answer', (req, res) => {
  const db = getDb();
  const { selectedAnswer } = req.body;

  if (!selectedAnswer) {
    return res.status(400).json({ error: 'selectedAnswer é obrigatório' });
  }

  const question = db.prepare('SELECT id, correct_answer FROM questions WHERE id = ?').get(req.params.id);
  if (!question) {
    return res.status(404).json({ error: 'Questão não encontrada' });
  }

  const isCorrect = question.correct_answer &&
    question.correct_answer.toUpperCase() === selectedAnswer.toUpperCase() ? 1 : 0;

  db.prepare(`
    INSERT INTO user_answers (question_id, selected_answer, is_correct)
    VALUES (?, ?, ?)
  `).run(req.params.id, selectedAnswer.toUpperCase(), isCorrect);

  res.json({
    success: true,
    isCorrect: isCorrect === 1,
    correctAnswer: question.correct_answer,
    selectedAnswer: selectedAnswer.toUpperCase()
  });
});

// GET /api/questions/:id/status — get answer status
router.get('/:id/status', (req, res) => {
  const db = getDb();
  const userAnswer = db.prepare(`
    SELECT * FROM user_answers
    WHERE question_id = ?
    ORDER BY id DESC LIMIT 1
  `).get(req.params.id);

  res.json({
    answered: !!userAnswer,
    answer: userAnswer || null
  });
});

module.exports = router;
