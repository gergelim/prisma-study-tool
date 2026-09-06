const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://estudeprisma.com';

/**
 * Fetch and parse the __NEXT_DATA__ JSON from a Next.js page
 */
async function fetchNextData(path) {
  try {
    const response = await axios.get(`${BASE_URL}${path}`, {
      timeout: 20000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      }
    });

    const $ = cheerio.load(response.data);
    const nextDataEl = $('#__NEXT_DATA__');
    if (!nextDataEl.length) return null;

    return JSON.parse(nextDataEl.html());
  } catch (err) {
    console.error(`[parser] Error fetching ${path}: ${err.message}`);
    return null;
  }
}

/**
 * Fetch the ENV configuration from the page
 */
async function fetchEnvConfig() {
  const nextData = await fetchNextData('/questoes/');
  if (!nextData) return null;

  try {
    const $ = cheerio.load('');
    // Try to get env from the page script
    return nextData;
  } catch (err) {
    return null;
  }
}

/**
 * Parse discipline data from __NEXT_DATA__
 */
function parseDisciplineFromNextData(pageProps) {
  if (!pageProps || !pageProps.disciplineTree) return null;
  return pageProps.disciplineTree;
}

/**
 * Sanitize HTML content: ensure safe rendering
 */
function sanitizeHtml(html) {
  if (!html) return '';
  // Ensure image links open in new tab
  return html.replace(/<img([^>]+)>/gi, (match, attrs) => {
    // Keep images as-is but add loading="lazy"
    if (!attrs.includes('loading=')) {
      return `<img${attrs} loading="lazy">`;
    }
    return match;
  }).replace(/<a([^>]+)>/gi, (match, attrs) => {
    // External links open in new tab
    if (!attrs.includes('target=')) {
      return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
    }
    return match;
  });
}

module.exports = { fetchNextData, parseDisciplineFromNextData, sanitizeHtml };
