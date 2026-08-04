// ===== ADMIN PANEL JAVASCRIPT =====

const ADMIN_API = '/api';

// ===== Auth =====
function getToken() { return localStorage.getItem('admin_token'); }
function getUser() {
  try { return JSON.parse(localStorage.getItem('admin_user')); }
  catch { return null; }
}
function requireAuth() {
  if (!getToken()) { window.location.href = '/admin/index.html'; return false; }
  return true;
}
function logout() {
  localStorage.removeItem('admin_token');
  localStorage.removeItem('admin_user');
  window.location.href = '/admin/index.html';
}

// ===== API =====
async function adminFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  try {
    const res = await fetch(`${ADMIN_API}${endpoint}`, { ...options, headers });
    if (res.status === 401) { logout(); return null; }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Terjadi kesalahan');
    return data;
  } catch (e) {
    let msg = e.message;
    if (msg === 'Failed to fetch') msg = 'Koneksi ke server terputus. Pastikan server berjalan.';
    showToast(msg, 'error');
    return null;
  }
}

async function uploadFile(file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload gagal');
    return data;
  } catch (e) {
    showToast(e.message, 'error');
    return null;
  }
}

async function handleUploadUI(input, targetId) {
  const file = input.files[0];
  if (!file) return;
  
  const b = input.previousElementSibling;
  let oldText = 'Upload';
  if (b) {
    oldText = b.textContent;
    b.textContent = '⏳ Mengunggah...';
  }
  
  const res = await uploadFile(file);
  
  if (b) {
    b.textContent = oldText;
  }
  
  if (res && res.url) {
    document.getElementById(targetId).value = res.url;
    showToast('Gambar berhasil diupload');
  }
  input.value = ''; // Reset input
}

// ===== Toast =====
function showToast(msg, type = 'success') {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = `toast ${type === 'error' ? 'error' : ''}`;
  t.textContent = (type === 'success' ? '✓ ' : '✕ ') + msg;
  document.body.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ===== Modal =====
function openModal(id) {
  document.getElementById(id)?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
  document.body.style.overflow = '';
}
function closeAllModals() {
  document.querySelectorAll('.admin-modal-overlay').forEach(m => m.classList.remove('open'));
  document.body.style.overflow = '';
}

// ===== Confirm Dialog =====
function confirmDialog(msg, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'admin-modal-overlay';
  overlay.innerHTML = `
    <div class="admin-modal" style="max-width:400px">
      <div class="admin-modal-header">
        <span class="admin-modal-title">⚠️ Konfirmasi</span>
      </div>
      <div class="admin-modal-body">
        <p style="font-size:0.92rem;color:var(--text-body)">${msg}</p>
      </div>
      <div class="admin-modal-footer">
        <button class="btn-admin btn-light" id="confirmNo">Batal</button>
        <button class="btn-admin btn-danger" id="confirmYes">Ya, Hapus</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => overlay.classList.add('open'), 10);
  overlay.querySelector('#confirmNo').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#confirmYes').addEventListener('click', () => { callback(); overlay.remove(); });
}

// ===== Format =====
function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatRupiah(n) {
  if (!n) return 'Rp 0';
  return 'Rp ' + Number(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// ===== Sidebar =====
function initSidebar() {
  const user = getUser();
  if (user) {
    document.querySelectorAll('[data-admin-nama]').forEach(el => el.textContent = user.nama);
    document.querySelectorAll('[data-admin-username]').forEach(el => el.textContent = user.username);
    document.querySelectorAll('[data-admin-initial]').forEach(el => el.textContent = user.nama?.charAt(0).toUpperCase() || 'A');
  }

  // Active link
  const page = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-link').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === page) link.classList.add('active');
  });

  // Logout
  document.querySelectorAll('[data-logout]').forEach(el => {
    el.addEventListener('click', () => {
      confirmDialog('Apakah Anda yakin ingin keluar?', logout);
    });
  });
}

// ===== NOTIFICATIONS =====
async function initNotifications() {
  const topbarRight = document.querySelector('.topbar-right');
  if (!topbarRight) return;

  const notifContainer = document.createElement('div');
  notifContainer.className = 'notif-container';
  notifContainer.innerHTML = `
    <button class="notif-btn" id="notifBtn">
      🔔<span class="notif-badge" id="notifBadge" style="display:none">0</span>
    </button>
    <div class="notif-dropdown" id="notifDropdown">
      <div class="notif-header">Notifikasi Terbaru</div>
      <div class="notif-list" id="notifList">
        <div class="notif-empty">Memuat...</div>
      </div>
    </div>
  `;
  // Insert before the first button (Lihat Website or Keluar)
  topbarRight.insertBefore(notifContainer, topbarRight.firstChild);

  const notifBtn = document.getElementById('notifBtn');
  const notifDropdown = document.getElementById('notifDropdown');
  const notifBadge = document.getElementById('notifBadge');
  const notifList = document.getElementById('notifList');

  // Toggle Dropdown
  notifBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('show');
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!notifContainer.contains(e.target)) {
      notifDropdown.classList.remove('show');
    }
  });

  // Fetch data
  const data = await adminFetch('/notifications');
  if (data && data.length > 0) {
    notifBadge.textContent = data.length;
    notifBadge.style.display = 'block';
    notifList.innerHTML = data.map(n => `
      <div class="notif-item">
        <div class="notif-icon">${n.icon}</div>
        <div class="notif-content">
          <div class="notif-title">${n.title}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    `).join('');
  } else {
    notifList.innerHTML = '<div class="notif-empty">Belum ada notifikasi baru</div>';
  }
}

// ===== Image Upload Preview =====
function initImageUpload(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  if (!input || !preview) return;
  
  input.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      preview.src = ev.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });
}

// ===== Pagination =====
function createPagination(total, limit, current, onPage) {
  const pages = Math.ceil(total / limit);
  if (pages <= 1) return '';
  
  let html = '<div class="admin-pagination" style="display:flex;gap:6px;margin-top:16px;justify-content:center">';
  for (let i = 1; i <= pages; i++) {
    html += `<button onclick="${onPage}(${i})" class="page-btn ${i === current ? 'active' : ''}">${i}</button>`;
  }
  html += '</div>';
  return html;
}

// ===== Init common =====
document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initSidebar();
  initNotifications();
  
  // Close modals on overlay click
  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAllModals();
    });
  });
});
