const express = require('express');
const router = express.Router();
const { getDb } = require('../../database/db');
const { startImportJob, repairImportJob, getJobStatus } = require('../../scraper/index');

// POST /api/import — start a new import job
router.post('/', async (req, res) => {
  const { disciplineId, subjectId } = req.body;

  if (!disciplineId && !subjectId) {
    return res.status(400).json({ error: 'disciplineId ou subjectId é obrigatório' });
  }

  try {
    const jobId = startImportJob(disciplineId || null, subjectId || null);
    res.json({ success: true, jobId, message: 'Importação iniciada em background' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/import/:jobId/repair — repair/resume an existing failed or incomplete job
router.post('/:jobId/repair', async (req, res) => {
  try {
    const jobId = repairImportJob(req.params.jobId);
    res.json({ success: true, jobId, message: 'Reparo da importação iniciado em background' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/import/:jobId/status — check job status
router.get('/:jobId/status', (req, res) => {
  const job = getJobStatus(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Job não encontrado' });
  }
  res.json({ job });
});

// GET /api/import/jobs — list all recent import jobs
router.get('/jobs', (req, res) => {
  const db = getDb();
  const jobs = db.prepare(`
    SELECT ij.*, d.name as discipline_name, s.name as subject_name
    FROM import_jobs ij
    LEFT JOIN disciplines d ON d.id = ij.discipline_id
    LEFT JOIN subjects s ON s.id = ij.subject_id
    ORDER BY ij.created_at DESC
    LIMIT 20
  `).all();
  res.json({ jobs });
});

module.exports = router;
