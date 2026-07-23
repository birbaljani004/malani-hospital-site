const store = require('../../data/store.js');
const { verifyAuth } = require('./lib/auth.js');
const { ok, error, preflight } = require('./lib/respond.js');

function slugify(s) {
  // ASCII-only: strips Devanagari/other non-ASCII so uploaded filenames never
  // need percent-encoding when requested back by the browser.
  const ascii = (s || '').toString().trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'file';
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const auth = verifyAuth(event);
  if (!auth) return error(401, 'लॉगिन आवश्यक है');
  if (event.httpMethod !== 'PUT') return error(405, 'Method not allowed');

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return error(400, 'अमान्य रिक्वेस्ट'); }

  const db = await store.load();
  const img = db.siteImages.find(s => s.key === body.key);
  if (!img) return error(404, 'फोटो स्लॉट नहीं मिला');
  if (!body.imageBase64) return error(400, 'फोटो ज़रूरी है');

  const buffer = Buffer.from(body.imageBase64.replace(/^data:.*;base64,/, ''), 'base64');
  const ext = (body.imageType && body.imageType.split('/')[1]) || 'jpg';
  const filename = `${slugify(img.key)}-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const key = `site/${filename}`;
  await store.saveFile(key, buffer, body.imageType || 'image/jpeg');

  img.file = `/media/${key}`;
  await store.save(db);
  return ok({ success: true, siteImage: img });
};
