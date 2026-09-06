const axios = require('axios');

const GRAPHQL_URL = 'https://api.estudeprisma.com/graphql';

const client = axios.create({
  baseURL: GRAPHQL_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Origin': 'https://estudeprisma.com',
    'Referer': 'https://estudeprisma.com/questoes/s',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Language': 'pt-BR,pt;q=0.9',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-site'
  }
});

async function query(gqlQuery, variables = {}, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await client.post('', { query: gqlQuery, variables });
      if (response.data.errors) {
        const errorMsg = response.data.errors.map(e => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMsg}`);
      }
      return response.data.data;
    } catch (err) {
      const status = err.response?.status;
      const isRetryable = status === 504 || status === 502 || status === 503 || status === 429 || status === 524 || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT';

      if (attempt === retries - 1 || (!isRetryable && status && status < 500)) {
        throw err;
      }

      // Exponential backoff: 2s, 4s, 8s, 12s...
      const waitTime = Math.min(2000 * Math.pow(1.8, attempt) + Math.random() * 800, 15000);
      console.warn(`[graphql] Tentativa ${attempt + 1}/${retries} falhou (${status || err.code || err.message}). Aguardando ${Math.round(waitTime)}ms para tentar novamente...`);
      await sleep(waitTime);
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Queries ───────────────────────────────────────────────────

// Fetch all disciplines with their subjects
const GET_DISCIPLINES = `
  query GetDisciplines {
    disciplines(paging: { limit: 100 }) {
      nodes {
        id
        name
        slug
        subjects(paging: { limit: 100 }) {
          nodes {
            id
            name
            slug
            order
          }
        }
      }
    }
  }
`;

// Fetch questions with offset pagination and optional filters
const GET_QUESTIONS = `
  query GetQuestions($limit: Int, $offset: Int, $disciplineId: String, $subjectId: String) {
    questions(
      paging: { limit: $limit, offset: $offset }
      filter: {
        disciplineId: $disciplineId
        subjects: $subjectId
      }
    ) {
      totalCount
      pageInfo {
        hasNextPage
        hasPreviousPage
      }
      nodes {
        id
        code
        description
        additionalText
        meta {
          correctAlternative
          alternatives { text rawText label }
        }
        discipline { id name slug }
        subjects { nodes { id name slug } }
        exams { nodes { id name year instituteId } }
      }
    }
  }
`;

// Simpler version without subject filter (subject filtering is complex)
const GET_QUESTIONS_BY_DISCIPLINE = `
  query GetQuestionsByDiscipline($limit: Int, $offset: Int, $disciplineId: String) {
    questions(
      paging: { limit: $limit, offset: $offset }
      filter: { disciplineId: { eq: $disciplineId } }
    ) {
      totalCount
      pageInfo { hasNextPage hasPreviousPage }
      nodes {
        id
        code
        description
        additionalText
        meta {
          correctAlternative
          alternatives { text rawText label }
        }
        discipline { id name slug }
        subjects { nodes { id name slug } }
        exams { nodes { id name year instituteId } }
      }
    }
  }
`;

// Fetch all questions without filter (when no discipline selected)
const GET_ALL_QUESTIONS = `
  query GetAllQuestions($limit: Int, $offset: Int) {
    questions(
      paging: { limit: $limit, offset: $offset }
    ) {
      totalCount
      pageInfo { hasNextPage hasPreviousPage }
      nodes {
        id
        code
        description
        additionalText
        meta {
          correctAlternative
          alternatives { text rawText label }
        }
        discipline { id name slug }
        subjects { nodes { id name slug } }
        exams { nodes { id name year instituteId } }
      }
    }
  }
`;

// Teacher comment for a specific question
const GET_TEACHER_COMMENT = `
  query GetTeacherComment($questionId: String) {
    questionTeacherComment(questionId: $questionId) {
      id
      description
    }
  }
`;

async function getDisciplines() {
  return query(GET_DISCIPLINES);
}

async function getQuestions(disciplineId, subjectId, offset = 0, limit = 50) {
  if (!disciplineId && !subjectId) {
    return query(GET_ALL_QUESTIONS, { limit, offset });
  }
  if (disciplineId) {
    return query(GET_QUESTIONS_BY_DISCIPLINE, { limit, offset, disciplineId });
  }
  // Subject-only filter (fallback to all questions)
  return query(GET_ALL_QUESTIONS, { limit, offset });
}

async function getTeacherComment(questionId) {
  try {
    return query(GET_TEACHER_COMMENT, { questionId });
  } catch (e) {
    return null;
  }
}

module.exports = { getDisciplines, getQuestions, getTeacherComment, sleep };
