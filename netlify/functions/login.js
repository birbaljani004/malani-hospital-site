const bcrypt = require('bcryptjs');
const store = require('../../data/store');
const { signToken } = require('./lib/auth');
const { ok, error, preflight } = require('./lib/respond');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return error(400, 'अमान्य रिक्वेस्ट'); }

  const { username, password } = body;
  const db = await store.load();

  if (username === db.admin.username && bcrypt.compareSync(password || '', db.admin.passwordHash)) {
    const token = signToken({ isAdmin: true, username });
    return ok({ token });
  }
  return error(401, 'गलत यूज़रनेम या पासवर्ड');
};
