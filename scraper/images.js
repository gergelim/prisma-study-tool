const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { getDb } = require('../database/db');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Extract all image URLs from HTML content
 */
function extractImageUrls(html) {
  if (!html) return [];
  const urls = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    urls.push({
      url: match[1],
      alt: (match[0].match(/alt=["']([^"']*)["']/) || [])[1] || ''
    });
  }
  return urls;
}

/**
 * Download an image and store locally
 */
async function downloadImage(url, questionId) {
  try {
    const ext = url.split('.').pop().split('?')[0].toLowerCase();
    const safeExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? ext : 'jpg';
    const filename = `${questionId}_${Date.now()}.${safeExt}`;
    const localPath = path.join(IMAGES_DIR, filename);

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'Referer': 'https://estudeprisma.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    fs.writeFileSync(localPath, response.data);
    return `/images/${filename}`;
  } catch (err) {
    console.warn(`[images] Failed to download ${url}: ${err.message}`);
    return null;
  }
}

/**
 * Process images for a question: detect, attempt download, store records
 */
async function processQuestionImages(questionId, statement, alternatives) {
  const db = getDb();
  const allHtml = [statement, ...alternatives.map(a => a.text)].join(' ');
  const imageUrls = extractImageUrls(allHtml);

  if (imageUrls.length === 0) return false;

  for (const { url, alt } of imageUrls) {
    // Check if already stored
    const existing = db.prepare('SELECT id FROM question_images WHERE question_id = ? AND original_url = ?').get(questionId, url);
    if (existing) continue;

    const localPath = await downloadImage(url, questionId);

    db.prepare(`
      INSERT OR IGNORE INTO question_images (question_id, original_url, local_path, alt_text)
      VALUES (?, ?, ?, ?)
    `).run(questionId, url, localPath, alt);
  }

  return imageUrls.length > 0;
}

/**
 * Replace original image URLs in HTML with local paths when available
 */
function replaceImageUrls(html, imageMap) {
  if (!html || !imageMap || imageMap.size === 0) return html;
  let result = html;
  for (const [originalUrl, localPath] of imageMap) {
    if (localPath) {
      result = result.split(originalUrl).join(localPath);
    }
  }
  return result;
}

module.exports = { extractImageUrls, processQuestionImages, replaceImageUrls };
