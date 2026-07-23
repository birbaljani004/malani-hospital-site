const crypto = require('crypto');
const store = require('../../data/store');
const { verifyAuth } = require('./lib/auth');
const { ok, error, preflight } = require('./lib/respond');

function slugify(s) {
  // ASCII-only: strips Devanagari/other non-ASCII so uploaded filenames never
  // need percent-encoding when requested back by the browser.
  const ascii = (s || '').toString().trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || 'file';
}

async function storeImage(base64, mimeType, nameHint) {
  const buffer = Buffer.from(base64.replace(/^data:.*;base64,/, ''), 'base64');
  const ext = (mimeType && mimeType.split('/')[1]) || 'jpg';
  const filename = `${slugify(nameHint)}-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const key = `site/${filename}`;
  await store.saveFile(key, buffer, mimeType || 'image/jpeg');
  return `/media/${key}`;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  const auth = verifyAuth(event);
  if (!auth) return error(401, 'लॉगिन आवश्यक है');

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return error(400, 'अमान्य रिक्वेस्ट'); }

  const db = await store.load();

  if (event.httpMethod === 'POST') {
    const id = 'notif-' + crypto.randomBytes(4).toString('hex');
    let image = '';
    if (body.imageBase64) image = await storeImage(body.imageBase64, body.imageType, 'notif');
    db.notifications.push({
      id, active: !!body.active, text: body.text || '', link: body.link || '',
      image, order: db.notifications.length + 1
    });
    await store.save(db);
    return ok({ success: true, notification: db.notifications[db.notifications.length - 1] });
  }

  if (event.httpMethod === 'PUT') {
    const n = db.notifications.find(x => x.id === body.id);
    if (!n) return error(404, 'सूचना नहीं मिली');
    n.text = body.text ?? n.text;
    n.link = body.link ?? n.link;
    n.active = body.active !== undefined ? !!body.active : n.active;
    if (body.order !== undefined) n.order = parseInt(body.order, 10) || n.order;
    if (body.imageBase64) n.image = await storeImage(body.imageBase64, body.imageType, 'notif');
    await store.save(db);
    return ok({ success: true, notification: n });
  }

  if (event.httpMethod === 'DELETE') {
    db.notifications = db.notifications.filter(n => n.id !== body.id);
    await store.save(db);
    return ok({ success: true });
  }

  return error(405, 'Method not allowed');
};
