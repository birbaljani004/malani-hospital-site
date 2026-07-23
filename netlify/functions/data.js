const store = require('../../data/store.js');
const { ok, error, preflight } = require('./lib/respond.js');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return preflight();
  if (event.httpMethod !== 'GET') return error(405, 'Method not allowed');
  try {
    const db = await store.load();
    return ok({
      doctors: db.doctors,
      notifications: db.notifications,
      content: db.content,
      siteImages: db.siteImages
    });
  } catch (e) {
    return error(500, 'डेटा लोड करने में समस्या: ' + e.message);
  }
};
