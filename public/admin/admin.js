// ---- Auth ----
const TOKEN_KEY = 'malani_admin_token';

function getToken() { return localStorage.getItem(TOKEN_KEY); }
function setToken(t) { localStorage.setItem(TOKEN_KEY, t); }
function clearToken() { localStorage.removeItem(TOKEN_KEY); }

function requireAuth() {
  if (!getToken()) window.location.href = '/admin/login.html';
}

function logout() {
  clearToken();
  window.location.href = '/admin/login.html';
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({}, options.headers || {}, { Authorization: 'Bearer ' + getToken() });
  if (options.body && typeof options.body !== 'string') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch('/api' + path, Object.assign({}, options, { headers }));
  if (res.status === 401) {
    clearToken();
    window.location.href = '/admin/login.html';
    throw new Error('लॉगिन आवश्यक है');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'कुछ गलत हुआ');
  return data;
}

// ---- Flash messages ----
function showFlash(msg, type = 'success') {
  const el = document.getElementById('flash');
  if (!el) return alert(msg);
  el.textContent = msg;
  el.className = 'flash show ' + type;
  setTimeout(() => { el.className = 'flash'; }, 5000);
}

// ---- Image compression (any size photo -> resized JPEG, safely under API limits) ----
const MAX_DIMENSION = 1800;
const JPEG_QUALITY = 0.85;
const SKIP_IF_UNDER = 1.2 * 1024 * 1024;

function compressFile(file) {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') return resolve(file);
    if (file.size < SKIP_IF_UNDER) return resolve(file);
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) { height = Math.round(height * (MAX_DIMENSION / width)); width = MAX_DIMENSION; }
        else { width = Math.round(width * (MAX_DIMENSION / height)); height = MAX_DIMENSION; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob || blob.size >= file.size) return resolve(file);
        resolve(new File([blob], file.name.replace(/\.[a-zA-Z0-9]+$/, '') + '.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', JPEG_QUALITY);
    };
    img.onerror = () => resolve(file);
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

// ---- Shared sidebar ----
function renderSidebar(active) {
  const el = document.getElementById('sidebar');
  if (!el) return;
  const items = [
    ['dashboard.html', '📊 डैशबोर्ड', 'dashboard'],
    ['doctors.html', '👨‍⚕️ डॉक्टर्स', 'doctors'],
    ['notifications.html', '📢 सूचनाएं', 'notifications'],
    ['images.html', '🖼️ साइट फोटो', 'images'],
    ['content.html', '📝 कंटेंट एडिटर', 'content'],
    ['password.html', '🔒 पासवर्ड बदलें', 'password']
  ];
  el.innerHTML = `
    <h1>🏥 मालाणी एडमिन</h1>
    ${items.map(([href, label, key]) => `<a href="${href}" class="${active === key ? 'active' : ''}">${label}</a>`).join('')}
    <a href="/" target="_blank">🌐 वेबसाइट देखें</a>
    <a onclick="logout()">🚪 लॉगआउट</a>
  `;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Attach to any <input type="file" data-compress> — shows a small status line,
// and exposes window.getCompressedPhoto(inputEl) -> {base64, type} for the
// form submit handler to call.
async function prepareCompressedInput(input) {
  if (!input.files || !input.files.length) return null;
  const original = input.files[0];
  let statusEl = input.nextElementSibling;
  if (!statusEl || !statusEl.classList.contains('compress-status')) {
    statusEl = document.createElement('div');
    statusEl.className = 'compress-status';
    input.insertAdjacentElement('afterend', statusEl);
  }
  statusEl.textContent = 'फोटो तैयार की जा रही है...';
  const compressed = await compressFile(original);
  const base64 = await fileToBase64(compressed);
  const beforeMB = (original.size / 1024 / 1024).toFixed(1);
  const afterMB = (compressed.size / 1024 / 1024).toFixed(1);
  statusEl.textContent = compressed !== original
    ? `✓ फोटो तैयार (${beforeMB}MB → ${afterMB}MB)`
    : `✓ फोटो तैयार (${beforeMB}MB)`;
  return { base64, type: compressed.type };
}
