const bcrypt = require('bcryptjs');
const store = require('../../data/store');
const { verifyAuth } = require('./lib/auth');
const { ok, error, preflight } = require('./lib/respond');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const auth = verifyAuth(event);
  if (!auth) return error(401, 'लॉगिन आवश्यक है');
  if (event.httpMethod !== 'POST') return error(405, 'Method not allowed');

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return error(400, 'अमान्य रिक्वेस्ट'); }

  const db = await store.load();
  const { currentPassword, newPassword, confirmPassword } = body;

  if (!bcrypt.compareSync(currentPassword || '', db.admin.passwordHash)) {
    return error(400, 'मौजूदा पासवर्ड गलत है।');
  }
  if (!newPassword || newPassword.length < 8) {
    return error(400, 'नया पासवर्ड कम से कम 8 अक्षरों का होना चाहिए।');
  }
  if (newPassword !== confirmPassword) {
    return error(400, 'नया पासवर्ड और पुष्टि पासवर्ड मेल नहीं खाते।');
  }

  db.admin.passwordHash = bcrypt.hashSync(newPassword, 10);
  await store.save(db);
  return ok({ success: true });
};
