const fs = require('fs');
const path = require('path');

// Statically required so esbuild embeds this JSON directly into the bundled
// function — no runtime file-path lookups, so it can never go missing after
// deployment regardless of how the bundler lays out the function.
const DEFAULT_SEED = require('./default-db.json');

const LOCAL_DB_PATH = path.join(__dirname, 'db.local.json');

function isNetlifyEnv() {
  return !!(process.env.NETLIFY || process.env.NETLIFY_DEV || process.env.NETLIFY_BLOBS_CONTEXT || process.env.LAMBDA_TASK_ROOT);
}

let blobsStore = null;
function getDbStore() {
  if (!blobsStore) {
    const { getStore } = require('@netlify/blobs');
    blobsStore = getStore('malani-hospital-db');
  }
  return blobsStore;
}

function cloneDefaultSeed() {
  return JSON.parse(JSON.stringify(DEFAULT_SEED));
}

async function load() {
  if (isNetlifyEnv()) {
    const store = getDbStore();
    const raw = await store.get('db');
    if (raw) return JSON.parse(raw);
    const seeded = cloneDefaultSeed();
    await store.set('db', JSON.stringify(seeded));
    return seeded;
  }
  if (!fs.existsSync(LOCAL_DB_PATH)) {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(cloneDefaultSeed(), null, 2));
  }
  return JSON.parse(fs.readFileSync(LOCAL_DB_PATH, 'utf8'));
}

async function save(db) {
  if (isNetlifyEnv()) {
    const store = getDbStore();
    await store.set('db', JSON.stringify(db));
    return;
  }
  fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(db, null, 2));
}

// ---- Uploaded file (image) storage ----
async function saveFile(key, buffer, contentType) {
  if (isNetlifyEnv()) {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('malani-hospital-uploads');
    await store.set(key, buffer, { metadata: { contentType } });
    return;
  }
  const dir = path.join(__dirname, 'local-uploads', path.dirname(key));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'local-uploads', key), buffer);
  fs.writeFileSync(path.join(__dirname, 'local-uploads', key + '.meta.json'), JSON.stringify({ contentType }));
}

async function getFile(key) {
  if (isNetlifyEnv()) {
    const { getStore } = require('@netlify/blobs');
    const store = getStore('malani-hospital-uploads');
    const result = await store.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!result) return null;
    return { data: Buffer.from(result.data), contentType: (result.metadata && result.metadata.contentType) || 'application/octet-stream' };
  }
  const filePath = path.join(__dirname, 'local-uploads', key);
  if (!fs.existsSync(filePath)) return null;
  let contentType = 'application/octet-stream';
  try {
    contentType = JSON.parse(fs.readFileSync(filePath + '.meta.json', 'utf8')).contentType;
  } catch (e) {}
  return { data: fs.readFileSync(filePath), contentType };
}

module.exports = { load, save, saveFile, getFile, isNetlifyEnv };
