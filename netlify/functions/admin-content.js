const store = require('../../data/store.js');
const { verifyAuth } = require('./lib/auth.js');
const { ok, error, preflight } = require('./lib/respond.js');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const auth = verifyAuth(event);
  if (!auth) return error(401, 'लॉगिन आवश्यक है');
  if (event.httpMethod !== 'PUT') return error(405, 'Method not allowed');

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return error(400, 'अमान्य रिक्वेस्ट'); }

  const db = await store.load();
  const { scope, page, fields } = body; // scope: 'global' | 'index' | 'page'

  if (scope === 'global') {
    Object.keys(fields || {}).forEach(k => { if (k in db.content.global) db.content.global[k] = fields[k]; });
  } else if (scope === 'index') {
    Object.keys(fields || {}).forEach(k => { if (k in db.content.pages.index) db.content.pages.index[k] = fields[k]; });
  } else if (scope === 'page') {
    const p = db.content.pages[page];
    if (!p) return error(404, 'पेज नहीं मिला');
    if (typeof (fields || {}).main === 'string') p.main = fields.main;
  } else {
    return error(400, 'अमान्य scope');
  }

  await store.save(db);
  return ok({ success: true, content: db.content });
};
