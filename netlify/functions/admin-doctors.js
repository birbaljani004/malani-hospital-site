const crypto = require('crypto');
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

async function storePhoto(photoBase64, photoType, nameHint) {
  const buffer = Buffer.from(photoBase64.replace(/^data:.*;base64,/, ''), 'base64');
  const ext = (photoType && photoType.split('/')[1]) || 'jpg';
  const filename = `${slugify(nameHint)}-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const key = `doctors/${filename}`;
  await store.saveFile(key, buffer, photoType || 'image/jpeg');
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
    const id = 'dr-' + crypto.randomBytes(4).toString('hex');
    let photo = '/assets/hospital-real.jpg';
    if (body.photoBase64) photo = await storePhoto(body.photoBase64, body.photoType, body.name);
    db.doctors.push({
      id,
      name: body.name || '', qualification: body.qualification || '',
      specialization: body.specialization || '', availability: body.availability || '',
      details: body.details || '', photo, order: db.doctors.length + 1
    });
    await store.save(db);
    return ok({ success: true, doctor: db.doctors[db.doctors.length - 1] });
  }

  if (event.httpMethod === 'PUT') {
    const doc = db.doctors.find(d => d.id === body.id);
    if (!doc) return error(404, 'डॉक्टर नहीं मिला');
    doc.name = body.name ?? doc.name;
    doc.qualification = body.qualification ?? doc.qualification;
    doc.specialization = body.specialization ?? doc.specialization;
    doc.availability = body.availability ?? doc.availability;
    doc.details = body.details ?? doc.details;
    if (body.order !== undefined) doc.order = parseInt(body.order, 10) || doc.order;
    if (body.photoBase64) doc.photo = await storePhoto(body.photoBase64, body.photoType, doc.name);
    await store.save(db);
    return ok({ success: true, doctor: doc });
  }

  if (event.httpMethod === 'DELETE') {
    db.doctors = db.doctors.filter(d => d.id !== body.id);
    await store.save(db);
    return ok({ success: true });
  }

  return error(405, 'Method not allowed');
};
