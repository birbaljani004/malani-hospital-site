(function () {
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), obj);
  }

  async function loadSiteData() {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error('data fetch failed');
      return await res.json();
    } catch (e) {
      console.warn('साइट डेटा लोड नहीं हो सका, डिफ़ॉल्ट कंटेंट दिखाया जा रहा है।', e);
      return null;
    }
  }

  function hydrateText(data) {
    document.querySelectorAll('[data-content]').forEach((el) => {
      const key = el.getAttribute('data-content');
      const val = getPath(data.content, key);
      if (val !== undefined && val !== null && val !== '') el.innerHTML = val;
    });
    document.querySelectorAll('[data-content-href]').forEach((el) => {
      const key = el.getAttribute('data-content-href');
      const val = getPath(data.content, key);
      if (val) el.setAttribute('href', 'tel:' + val);
    });
  }

  function hydrateImages(data) {
    document.querySelectorAll('[data-site-image]').forEach((el) => {
      const key = el.getAttribute('data-site-image');
      const found = (data.siteImages || []).find((s) => s.key === key);
      if (found && found.file) el.setAttribute('src', found.file);
    });
  }

  function hydrateNotice(data) {
    const inner = document.getElementById('noticeInner');
    const bar = inner ? inner.closest('.notice-bar') : null;
    if (!inner) return;
    const active = (data.notifications || []).filter((n) => n.active);
    if (!active.length) {
      if (bar) bar.style.display = 'none';
      return;
    }
    const spansOnce = active.map((n) => {
      const text = n.text || '';
      return n.link ? `<span><a class="notice-bar-link" style="color:inherit;text-decoration:underline;" href="${n.link}">${text}</a></span>` : `<span>${text}</span>`;
    }).join('');
    inner.innerHTML = spansOnce + spansOnce; // doubled for seamless CSS scroll
  }

  function hydratePageBlock(data) {
    const block = document.getElementById('pageContentBlock');
    if (!block) return;
    const pageKey = block.getAttribute('data-content-page');
    const pageData = data.content.pages && data.content.pages[pageKey];
    if (pageData && pageData.main) block.innerHTML = pageData.main;
  }

  function doctorCardHTML(d) {
    return `
    <div class="doctor-card" onclick="openDoctorModal('${d.id}')">
      <div class="doc-photo-wrap"><img src="${d.photo}" alt="${d.name}"/></div>
      <div class="doc-body">
        <h3>${d.name}</h3>
        <div class="doc-spec">${d.specialization}</div>
        <p>${d.qualification}</p>
        <span class="doc-avail">${d.availability}</span>
      </div>
    </div>`;
  }

  function hydrateDoctors(data) {
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;
    const doctors = (data.doctors || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
    grid.innerHTML = doctors.map(doctorCardHTML).join('');
    window.__DOCTORS__ = doctors;
    document.querySelectorAll('[data-content="doctorCount"]').forEach((el) => { el.textContent = doctors.length + '+'; });
  }

  window.openDoctorModal = function (id) {
    const d = (window.__DOCTORS__ || []).find((x) => x.id === id);
    if (!d) return;
    document.getElementById('docModalPhoto').src = d.photo;
    document.getElementById('docModalPhoto').alt = d.name;
    document.getElementById('docModalName').textContent = d.name;
    document.getElementById('docModalSpec').textContent = d.specialization;
    document.getElementById('docModalQual').textContent = d.qualification;
    document.getElementById('docModalAvail').textContent = d.availability;
    document.getElementById('docModalDetails').textContent = d.details;
    document.getElementById('docModalOverlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  };
  window.closeDoctorModal = function () {
    const ov = document.getElementById('docModalOverlay');
    if (ov) ov.classList.remove('open');
    document.body.style.overflow = '';
  };

  document.addEventListener('DOMContentLoaded', async () => {
    const data = await loadSiteData();
    if (!data) return;
    hydrateText(data);
    hydrateImages(data);
    hydrateNotice(data);
    hydratePageBlock(data);
    hydrateDoctors(data);
  });
})();
