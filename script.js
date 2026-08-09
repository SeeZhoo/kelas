/* ===========================================================
   STRUKTUR KELAS — script.js
   1) toggle tema terang / gelap
   2) fotoFallback -> kotak inisial jika foto belum diupload
   3) login admin (sementara hardcode, ganti dengan backend nanti)
   4) CRUD tugas (sementara localStorage, ganti dengan fetch() ke
      API/database nanti — lihat komentar di bagian "DATA LAYER")
   =========================================================== */

/* ---------------- TEMA ---------------- */
(function () {
  const root = document.documentElement;
  const btn = document.getElementById('themeToggle');

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let theme = prefersDark ? 'dark' : 'light';
  applyTheme(theme);

  btn.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(theme);
  });

  function applyTheme(mode) {
    root.setAttribute('data-theme', mode);
    btn.setAttribute('aria-pressed', mode === 'dark');
  }
})();

// Ganti <img> yang gagal dimuat dengan kotak inisial.
function fotoFallback(imgEl, label) {
  const bungkus = imgEl.parentElement;
  const kotak = document.createElement('div');
  kotak.className = 'foto-kosong';
  kotak.textContent = label;
  imgEl.remove();
  bungkus.appendChild(kotak);
}


/* ===========================================================
   DATA LAYER — TUGAS
   Saat ini disimpan di localStorage (per-browser, khusus untuk
   development lokal). Ganti ketiga fungsi di bawah ini dengan
   pemanggilan API (fetch ke backend + database kamu) nanti —
   bagian lain dari kode ini (render, form, tombol) tidak perlu
   diubah karena semuanya lewat 3 fungsi ini.
   =========================================================== */

const TUGAS_KEY = 'xitkj1-tugas';

function getTugasList() {
  try {
    return JSON.parse(localStorage.getItem(TUGAS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTugasList(list) {
  localStorage.setItem(TUGAS_KEY, JSON.stringify(list));
}

function seedTugasJikaKosong() {
  if (getTugasList().length === 0) {
    saveTugasList([
      {
        id: crypto.randomUUID(),
        mapel: 'Administrasi Infrastruktur Jaringan',
        judul: 'Konfigurasi VLAN Trunking',
        deskripsi: 'Buat topologi 2 switch dengan 3 VLAN, dokumentasikan konfigurasi trunk-nya.',
        deadline: '2026-08-20',
        link: '',
        dibuat: Date.now()
      }
    ]);
  }
}


/* ===========================================================
   LOGIN ADMIN
   Kredensial di bawah ini HANYA untuk demo di localhost.
   Jangan dipakai untuk deployment sungguhan — pindahkan proses
   login ke backend (cek username/password di server + database,
   pakai session/token) sebelum website ini online.
   =========================================================== */

const ADMIN_CREDENTIALS = { username: 'admin', password: 'tkj12025' };
const SESSION_KEY = 'xitkj1-admin-session';

function isAdminLoggedIn() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

function setAdminLoggedIn(value) {
  if (value) sessionStorage.setItem(SESSION_KEY, '1');
  else sessionStorage.removeItem(SESSION_KEY);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.readAsDataURL(file);
  });
}


/* ---------------- INISIALISASI HALAMAN ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  seedTugasJikaKosong();

  const adminBtn = document.getElementById('adminBtn');
  const modeBadge = document.getElementById('modeBadge');
  const tugasForm = document.getElementById('tugasForm');

  const overlay = document.getElementById('loginOverlay');
  const closeModal = document.getElementById('closeModal');
  const loginForm = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const attachmentOverlay = document.getElementById('attachmentOverlay');
  const closeAttachment = document.getElementById('closeAttachment');
  const attachmentBody = document.getElementById('attachmentBody');
  const downloadAttachment = document.getElementById('downloadAttachment');
  const attachmentInput = document.getElementById('fAttachment');

  let editingId = null;

  overlay.hidden = true;
  attachmentOverlay.hidden = true;
  loginError.hidden = true;
  refreshAdminUI();
  renderTugas();

  /* --- buka/tutup modal login, atau langsung logout kalau sudah login --- */
  adminBtn.addEventListener('click', () => {
    if (isAdminLoggedIn()) {
      setAdminLoggedIn(false);
      refreshAdminUI();
      renderTugas();
    } else {
      overlay.hidden = false;
      loginError.hidden = true;
      document.getElementById('lUser').focus();
    }
  });

  closeModal.addEventListener('click', () => { overlay.hidden = true; loginError.hidden = true; });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.hidden = true; loginError.hidden = true; } });
  closeAttachment.addEventListener('click', () => { attachmentOverlay.hidden = true; });
  attachmentOverlay.addEventListener('click', (e) => { if (e.target === attachmentOverlay) attachmentOverlay.hidden = true; });

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('lUser').value.trim();
    const pass = document.getElementById('lPass').value;

    if (user === ADMIN_CREDENTIALS.username && pass === ADMIN_CREDENTIALS.password) {
      setAdminLoggedIn(true);
      overlay.hidden = true;
      loginError.hidden = true;
      loginForm.reset();
      refreshAdminUI();
      renderTugas();
    } else {
      loginError.hidden = false;
    }
  });

  /* --- tambah / edit tugas --- */
  tugasForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let attachment = null;
    const file = attachmentInput.files[0];
    if (file) {
      try {
        attachment = {
          name: file.name,
          type: file.type,
          dataUrl: await fileToDataUrl(file)
        };
      } catch {
        alert('Gagal membaca lampiran. Coba file lain.');
        return;
      }
    }

    const data = {
      mapel: document.getElementById('fMapel').value.trim(),
      judul: document.getElementById('fJudul').value.trim(),
      deskripsi: document.getElementById('fDeskripsi').value.trim(),
      deadline: document.getElementById('fDeadline').value,
      link: document.getElementById('fLink').value.trim()
    };

    const list = getTugasList();

    if (editingId) {
      const idx = list.findIndex(t => t.id === editingId);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...data, attachment: attachment || list[idx].attachment };
      }
      editingId = null;
      document.getElementById('cancelEdit').hidden = true;
      tugasForm.querySelector('button[type="submit"]').textContent = 'Tambah Tugas';
    } else {
      list.unshift({ id: crypto.randomUUID(), ...data, attachment, dibuat: Date.now() });
    }

    saveTugasList(list);
    tugasForm.reset();
    attachmentInput.value = '';
    renderTugas();
  });

  document.getElementById('cancelEdit').addEventListener('click', () => {
    editingId = null;
    tugasForm.reset();
    document.getElementById('cancelEdit').hidden = true;
    tugasForm.querySelector('button[type="submit"]').textContent = 'Tambah Tugas';
  });

  function refreshAdminUI() {
    const loggedIn = isAdminLoggedIn();
    adminBtn.textContent = loggedIn ? 'Logout Admin' : 'Login Admin';
    adminBtn.classList.toggle('is-active', loggedIn);
    modeBadge.hidden = !loggedIn;
    tugasForm.hidden = !loggedIn;
    overlay.hidden = true;
    attachmentOverlay.hidden = true;
    loginError.hidden = true;
  }

  function renderTugas() {
    const list = getTugasList().sort((a, b) => a.deadline.localeCompare(b.deadline));
    const wrap = document.getElementById('tugasList');
    const empty = document.getElementById('tugasEmpty');
    const loggedIn = isAdminLoggedIn();

    wrap.innerHTML = '';
    empty.hidden = list.length !== 0;

    const today = new Date().toISOString().slice(0, 10);
    const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    });

    list.forEach(t => {
      const card = document.createElement('article');
      card.className = 'tugas-card';

      const lewat = t.deadline < today;

      card.innerHTML = `
        <div class="tugas-main">
          <div class="tugas-top">
            <span class="tugas-mapel">${escapeHtml(t.mapel)}</span>
            <span class="tugas-deadline ${lewat ? 'lewat' : ''}">
              ${lewat ? 'Lewat batas' : 'Batas'}: ${fmt(t.deadline)}
            </span>
          </div>
          <p class="tugas-judul">${escapeHtml(t.judul)}</p>
          <p class="tugas-desc">${escapeHtml(t.deskripsi)}</p>
          ${t.link ? `<a class="tugas-link" href="${escapeAttr(t.link)}" target="_blank" rel="noopener">Buka lampiran &rarr;</a>` : ''}
        </div>
        <div class="tugas-meta">
          ${t.attachment ? `
            <button class="tugas-attach-btn" type="button" data-action="preview" data-id="${t.id}">
              <span class="tugas-attach-icon">${t.attachment.type === 'application/pdf' ? 'PDF' : 'IMG'}</span>
              <span class="tugas-attach-name">${escapeHtml(t.attachment.name)}</span>
            </button>
          ` : ''}
          ${loggedIn ? `
          <div class="tugas-actions">
            <button class="btn-icon" data-action="edit" data-id="${t.id}" aria-label="Edit tugas">✎</button>
            <button class="btn-icon danger" data-action="delete" data-id="${t.id}" aria-label="Hapus tugas">✕</button>
          </div>` : ''}
        </div>
      `;
      wrap.appendChild(card);
    });

    wrap.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!confirm('Hapus tugas ini?')) return;
        saveTugasList(getTugasList().filter(t => t.id !== btn.dataset.id));
        renderTugas();
      });
    });

    wrap.querySelectorAll('[data-action="preview"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = getTugasList().find(item => item.id === btn.dataset.id);
        if (!t?.attachment) return;
        openAttachmentModal(t.attachment);
      });
    });

    wrap.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = getTugasList().find(t => t.id === btn.dataset.id);
        if (!t) return;
        editingId = t.id;
        document.getElementById('fMapel').value = t.mapel;
        document.getElementById('fJudul').value = t.judul;
        document.getElementById('fDeskripsi').value = t.deskripsi;
        document.getElementById('fDeadline').value = t.deadline;
        document.getElementById('fLink').value = t.link || '';
        document.getElementById('cancelEdit').hidden = false;
        tugasForm.querySelector('button[type="submit"]').textContent = 'Simpan Perubahan';
        tugasForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    });
  }

  function openAttachmentModal(attachment) {
    attachmentBody.innerHTML = '';

    if (attachment.type.startsWith('image/')) {
      const img = document.createElement('img');
      img.src = attachment.dataUrl;
      img.alt = attachment.name;
      img.className = 'attachment-preview-image';
      attachmentBody.appendChild(img);
    } else if (attachment.type === 'application/pdf') {
      const iframe = document.createElement('iframe');
      iframe.src = attachment.dataUrl;
      iframe.className = 'attachment-frame';
      iframe.title = attachment.name;
      attachmentBody.appendChild(iframe);
    } else {
      attachmentBody.innerHTML = `<p class="tugas-desc">Format lampiran tidak bisa dipratinjau di browser. Silakan unduh file.</p>`;
    }

    downloadAttachment.href = attachment.dataUrl;
    downloadAttachment.download = attachment.name;
    attachmentOverlay.hidden = false;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
  function escapeAttr(str) {
    return escapeHtml(str).replace(/"/g, '&quot;');
  }
});
