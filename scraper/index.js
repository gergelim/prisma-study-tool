const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database/db');
const { getDisciplines, getQuestions, getTeacherComment, sleep } = require('./graphql');
const { processQuestionImages } = require('./images');
const { sanitizeHtml } = require('./parser');

function updateJob(db, jobId, updates) {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  db.prepare(`UPDATE import_jobs SET ${fields} WHERE id = ?`).run(...values, jobId);
}

function getJobStatus(jobId) {
  const db = getDb();
  return db.prepare('SELECT * FROM import_jobs WHERE id = ?').get(jobId) || null;
}

const DISCIPLINE_COLORS = {
  'portugues': '#00a0e9',
  'ingles': '#0066d6',
  'literatura': '#7a1fa2',
  'redacao': '#c2185b',
  'historia': '#c62828',
  'geografia': '#e65100',
  'filosofia': '#f57c00',
  'sociologia': '#fbc02d',
  'atualidades': '#fbc02d',
  'biologia': '#c0ca33',
  'fisica': '#8bc34a',
  'quimica': '#7cb342',
  'matematica': '#00bfa5',
  'espanhol': '#0288d1',
  'artes-cenicas': '#ab47bc',
  'artes-plasticas': '#8e24aa',
  'artes-visuais': '#5e35b1',
  'educacao-fisica': '#43a047',
  'educacao-artistica': '#9c27b0',
  'historia-e-geografia-de-estados-e-municipios': '#d84315'
};

/**
 * Sync disciplines from the remote API into the local database
 */
async function syncDisciplines() {
  const db = getDb();
  try {
    const data = await getDisciplines();
    if (!data || !data.disciplines) return [];

    const disciplines = data.disciplines.nodes || [];

    for (const disc of disciplines) {
      const color = disc.color || DISCIPLINE_COLORS[disc.slug] || '#6366f1';
      db.prepare(`
        INSERT OR REPLACE INTO disciplines (id, name, slug, color)
        VALUES (?, ?, ?, ?)
      `).run(disc.id, disc.name, disc.slug, color);

      // Sync subjects (flat list — no children in this API)
      const subjects = disc.subjects?.nodes || [];
      for (const subj of subjects) {
        db.prepare(`
          INSERT OR REPLACE INTO subjects (id, discipline_id, parent_id, name, slug, "order")
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(subj.id, disc.id, null, subj.name, subj.slug, subj.order || 0);
      }
    }

    return disciplines;
  } catch (err) {
    console.error('[scraper] Failed to sync disciplines:', err.message);
    throw err;
  }
}

/**
 * Map API question node to DB row
 */
function mapQuestion(q) {
  // alternatives: [{text, rawText, label}] → store as [{letter, text}]
  const alternatives = (q.meta?.alternatives || []).map(a => ({
    letter: a.label || '',
    text: sanitizeHtml(a.text || a.rawText || '')
  }));

  const correctAnswer = q.meta?.correctAlternative || null;

  // Get exam info
  const exam = q.exams?.nodes?.[0] || null;
  const institute = exam?.name || null;
  const year = exam?.year || null;

  // Get subject
  const subject = q.subjects?.nodes?.[0] || null;
  const subjectId = subject?.id || null;

  const disciplineId = q.discipline?.id || null;

  return {
    id: uuidv4(),
    originalId: q.id,
    originalUrl: `https://estudeprisma.com/questoes/${q.code || q.id}`,
    disciplineId,
    subjectId,
    institute,
    year,
    statement: sanitizeHtml(q.description || ''),
    additionalText: sanitizeHtml(q.additionalText || ''),
    alternatives,
    correctAnswer,
  };
}

/**
 * Import questions for a given discipline/subject (background job)
 */
/**
 * Import questions for a given discipline/subject (background job)
 */
async function importQuestions(jobId, options = {}) {
  const { resume = false } = options;
  const db = getDb();
  const job = db.prepare('SELECT * FROM import_jobs WHERE id = ?').get(jobId);
  if (!job) return;

  const PAGE_SIZE = 50;
  let offset = 0;
  let page = 0;
  let totalFound = job.total_found || 0;
  let totalSaved = 0;
  let totalSkipped = 0;

  if (resume) {
    // Resume from the page before the failure to catch all missing questions safely
    const startPage = Math.max(1, (job.current_page || 1) - 1);
    offset = (startPage - 1) * PAGE_SIZE;
    page = startPage - 1;

    // Get current accurate saved count for this discipline
    if (job.discipline_id) {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM questions WHERE discipline_id = ?').get(job.discipline_id);
      totalSaved = row ? row.cnt : (job.total_saved || 0);
    } else {
      totalSaved = job.total_saved || 0;
    }
    totalSkipped = job.total_skipped || 0;

    console.log(`[scraper] Reparando job ${jobId}: retomando da página ${startPage} (offset ${offset}) com ${totalSaved} questões salvas`);
    updateJob(db, jobId, {
      status: 'running',
      error_message: null,
      current_page: startPage,
      total_saved: totalSaved,
      started_at: new Date().toISOString()
    });
  } else {
    updateJob(db, jobId, { status: 'running', started_at: new Date().toISOString() });
  }

  try {
    let hasMore = true;

    while (hasMore) {
      page++;
      updateJob(db, jobId, { current_page: page });

      let data = null;
      for (let pageAttempt = 1; pageAttempt <= 4; pageAttempt++) {
        try {
          data = await getQuestions(job.discipline_id || null, job.subject_id || null, offset, PAGE_SIZE);
          break;
        } catch (fetchErr) {
          console.error(`[scraper] Página ${page} tentativa ${pageAttempt}/4 falhou:`, fetchErr.message);
          if (pageAttempt === 4) {
            updateJob(db, jobId, {
              status: 'error',
              error_message: `Falha na página ${page}: ${fetchErr.message}`,
              finished_at: new Date().toISOString()
            });
            return;
          }
          await sleep(2500 * pageAttempt);
        }
      }

      if (!data || !data.questions) {
        hasMore = false;
        break;
      }

      const { nodes, pageInfo, totalCount } = data.questions;
      totalFound = totalCount || totalFound;
      updateJob(db, jobId, { total_found: totalFound });

      for (const q of (nodes || [])) {
        const existing = db.prepare('SELECT id FROM questions WHERE original_id = ?').get(q.id);

        if (existing) {
          totalSkipped++;
        } else {
          const mapped = mapQuestion(q);
          if (job.discipline_id && job.discipline_id.startsWith('custom:')) {
            mapped.disciplineId = job.discipline_id;
          }

          db.prepare(`
            INSERT OR IGNORE INTO questions
            (id, original_id, original_url, discipline_id, subject_id, institute, year,
             statement, alternatives, correct_answer, explanation, has_images)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          `).run(
            mapped.id,
            mapped.originalId,
            mapped.originalUrl,
            mapped.disciplineId,
            mapped.subjectId,
            mapped.institute,
            mapped.year,
            mapped.statement,
            JSON.stringify(mapped.alternatives),
            mapped.correctAnswer,
            null  // explanation fetched lazily if needed
          );

          // Store additionalText as part of statement if exists
          if (mapped.additionalText) {
            db.prepare('UPDATE questions SET statement = ? WHERE id = ?')
              .run(mapped.statement + (mapped.additionalText ? `\n<hr>\n${mapped.additionalText}` : ''), mapped.id);
          }

          // Process images asynchronously
          processQuestionImages(mapped.id, mapped.statement, mapped.alternatives).then(hasImgs => {
            if (hasImgs) db.prepare('UPDATE questions SET has_images = 1 WHERE id = ?').run(mapped.id);
          }).catch(() => {});

          totalSaved++;
        }
      }

      updateJob(db, jobId, { total_saved: totalSaved, total_skipped: totalSkipped });

      hasMore = pageInfo?.hasNextPage || false;
      offset += PAGE_SIZE;

      // Respectful delay between pages
      if (hasMore) await sleep(500);
    }

    updateJob(db, jobId, {
      status: 'done',
      total_found: totalFound,
      total_saved: totalSaved,
      total_skipped: totalSkipped,
      finished_at: new Date().toISOString()
    });

    console.log(`[scraper] Job ${jobId} finalizado com sucesso: ${totalSaved} salvas, ${totalSkipped} existentes de ${totalFound} total`);
  } catch (err) {
    console.error(`[scraper] Job ${jobId} failed:`, err.message);
    updateJob(db, jobId, {
      status: 'error',
      error_message: err.message,
      finished_at: new Date().toISOString()
    });
  }
}

/**
 * Start a new import job (runs in background)
 */
function startImportJob(disciplineId, subjectId) {
  const db = getDb();
  const jobId = uuidv4();

  db.prepare(`
    INSERT INTO import_jobs (id, discipline_id, subject_id, status, created_at)
    VALUES (?, ?, ?, 'pending', datetime('now'))
  `).run(jobId, disciplineId || null, subjectId || null);

  setImmediate(() => importQuestions(jobId));
  return jobId;
}

/**
 * Repair / resume an existing import job
 */
function repairImportJob(jobId) {
  const db = getDb();
  const job = db.prepare('SELECT * FROM import_jobs WHERE id = ?').get(jobId);
  if (!job) throw new Error('Job de importação não encontrado');
  if (job.status === 'running') throw new Error('Este job já está em execução');

  updateJob(db, jobId, {
    status: 'pending',
    error_message: null
  });

  setImmediate(() => importQuestions(jobId, { resume: true }));
  return jobId;
}

module.exports = { syncDisciplines, startImportJob, repairImportJob, getJobStatus };
