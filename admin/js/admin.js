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
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const originalText = input.nextElementSibling ? input.nextElementSibling.textContent : '';
  const btn = input.nextElementSibling;
  if(btn) btn.textContent = '⏳ Mengunggah...';
  input.disabled = true;
  
  const res = await uploadFile(file);
  input.disabled = false;
  if (res && res.url) {
    document.getElementById(targetId).value = res.url;
    showToast('File berhasil diunggah');
  }
  if(btn) btn.textContent = originalText || 'Upload';
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
  
  // Close modals on overlay click
  document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAllModals();
    });
  });
});
