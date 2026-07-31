const fs = require('fs');
const path = require('path');

const dst = path.join(__dirname, 'admin', 'pendidikan.html');

const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Kelola Lembaga Pendidikan - Admin</title>
  <link rel="icon" href="/images/logo.png" />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/admin/css/admin.css" />
</head>
<body>
<div class="admin-layout">
  <aside class="sidebar" id="sidebar" data-page="pendidikan"></aside>
  <main class="admin-main">
    <div class="topbar">
      <div class="topbar-left"><div class="topbar-title">Lembaga Pendidikan</div></div>
      <div class="topbar-right"><a href="/pendidikan.html" target="_blank" class="topbar-btn topbar-view-site">🌐 Lihat Website</a></div>
    </div>
    <div class="page-content">
      <div class="page-header-admin">
        <div>
          <h1>🎓 Kelola Lembaga Pendidikan</h1>
          <p>Tambah, ubah, dan hapus data instansi pendidikan di wilayah desa</p>
        </div>
        <button class="btn-admin btn-primary-admin" onclick="openModalForm()">➕ Tambah Lembaga</button>
      </div>

      <div class="admin-card">
        <div class="admin-card-body">
          <div class="table-responsive">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Lembaga</th>
                  <th>Jenjang</th>
                  <th>Status & Akreditasi</th>
                  <th>Kepala Sekolah</th>
                  <th>Siswa</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="tableBody">
                <tr><td colspan="7" style="text-align:center">Memuat data...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </main>
</div>

<!-- Modal Form -->
<div class="admin-modal-overlay" id="modalForm">
  <div class="admin-modal" style="max-width: 700px">
    <div class="admin-modal-header">
      <h3 id="modalTitle">Tambah Lembaga</h3>
      <button class="close-btn" onclick="closeAllModals()">✕</button>
    </div>
    <div class="admin-modal-body">
      <form id="formEdu" onsubmit="saveData(event)">
        <input type="hidden" id="eduId">
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">Nama Lembaga</label>
            <input type="text" class="form-control" id="eduNama" required>
          </div>
          <div class="form-group">
            <label class="form-label">Jenjang</label>
            <select class="form-control" id="eduJenjang" required>
              <option value="TK">TK/PAUD</option>
              <option value="SD">SD/MI</option>
              <option value="SMP">SMP/MTs</option>
              <option value="SMA">SMA/SMK</option>
              <option value="Lainnya">Lainnya</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-control" id="eduStatus">
              <option value="Negeri">Negeri</option>
              <option value="Swasta">Swasta</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">NPSN</label>
            <input type="text" class="form-control" id="eduNPSN">
          </div>

          <div class="form-group">
            <label class="form-label">Akreditasi</label>
            <select class="form-control" id="eduAkreditasi">
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
              <option value="Belum Akreditasi">Belum Akreditasi</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Kepala Sekolah</label>
            <input type="text" class="form-control" id="eduKepsek">
          </div>

          <div class="form-group">
            <label class="form-label">Jumlah Guru</label>
            <input type="number" class="form-control" id="eduGuru" min="0" value="0">
          </div>
          <div class="form-group">
            <label class="form-label">Jumlah Siswa</label>
            <input type="number" class="form-control" id="eduSiswa" min="0" value="0">
          </div>
        </div>

        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Profil / Deskripsi Singkat</label>
          <textarea class="form-control" id="eduProfil" rows="3" required></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Alamat Lengkap</label>
          <input type="text" class="form-control" id="eduAlamat">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label class="form-label">Narahubung (No HP)</label>
            <input type="text" class="form-control" id="eduCP">
          </div>
          <div class="form-group">
            <label class="form-label">Link Info/Pendaftaran (Opsional)</label>
            <input type="url" class="form-control" id="eduLink" placeholder="https://...">
          </div>
        </div>
      </form>
    </div>
    <div class="admin-modal-footer">
      <button class="btn-admin btn-light" onclick="closeAllModals()">Batal</button>
      <button type="submit" form="formEdu" class="btn-admin btn-primary-admin">Simpan Data</button>
    </div>
  </div>
</div>

<script src="/admin/js/sidebar.js"></script>
<script src="/admin/js/admin.js"></script>
<script>
let eduList = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  await loadData();
});

async function loadData() {
  const data = await adminFetch('/pendidikan');
  eduList = data || [];
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById('tableBody');
  if (eduList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center">Belum ada data lembaga pendidikan</td></tr>';
    return;
  }
  
  tbody.innerHTML = eduList.map((d, i) => \`
    <tr>
      <td>\${i + 1}</td>
      <td style="font-weight:600">\${d.nama_sekolah || d.nama || '-'}</td>
      <td><span class="badge" style="background:#e0e0e0;color:#333">\${d.jenjang || '-'}</span></td>
      <td>\${d.status || '-'} <br> <small>Akreditasi \${d.akreditasi || '-'}</small></td>
      <td>\${d.kepala_sekolah || '-'}</td>
      <td>\${d.jumlah_siswa || 0} Anak</td>
      <td>
        <button class="btn-admin btn-sm-admin btn-light" style="padding:4px 8px;font-size:12px" onclick="editData(\${i})">✏️ Edit</button>
        <button class="btn-admin btn-sm-admin btn-danger" style="padding:4px 8px;font-size:12px" onclick="deleteData(\${i})">🗑️ Hapus</button>
      </td>
    </tr>
  \`).join('');
}

function openModalForm(idx = null) {
  const isEdit = idx !== null;
  document.getElementById('modalTitle').textContent = isEdit ? 'Edit Lembaga' : 'Tambah Lembaga';
  document.getElementById('formEdu').reset();
  
  if (isEdit) {
    const d = eduList[idx];
    document.getElementById('eduId').value = d.id;
    document.getElementById('eduNama').value = d.nama_sekolah || d.nama || '';
    document.getElementById('eduJenjang').value = d.jenjang || 'SD';
    document.getElementById('eduStatus').value = d.status || 'Negeri';
    document.getElementById('eduNPSN').value = d.npsn || '';
    document.getElementById('eduAkreditasi').value = d.akreditasi || 'A';
    document.getElementById('eduKepsek').value = d.kepala_sekolah || '';
    document.getElementById('eduGuru').value = d.jumlah_guru || 0;
    document.getElementById('eduSiswa').value = d.jumlah_siswa || 0;
    document.getElementById('eduProfil').value = d.profil_sekolah || '';
    document.getElementById('eduAlamat').value = d.alamat || '';
    document.getElementById('eduCP').value = d.contact_person || '';
    document.getElementById('eduLink').value = d.link_pendaftaran || '';
  } else {
    document.getElementById('eduId').value = '';
  }
  
  openModal('modalForm');
}

function editData(idx) {
  openModalForm(idx);
}

async function deleteData(idx) {
  if (confirm('Yakin ingin menghapus data lembaga pendidikan ini?')) {
    eduList.splice(idx, 1);
    await syncToServer();
  }
}

async function saveData(e) {
  e.preventDefault();
  
  const payload = {
    nama_sekolah: document.getElementById('eduNama').value,
    jenjang: document.getElementById('eduJenjang').value,
    status: document.getElementById('eduStatus').value,
    npsn: document.getElementById('eduNPSN').value,
    akreditasi: document.getElementById('eduAkreditasi').value,
    kepala_sekolah: document.getElementById('eduKepsek').value,
    jumlah_guru: parseInt(document.getElementById('eduGuru').value) || 0,
    jumlah_siswa: parseInt(document.getElementById('eduSiswa').value) || 0,
    profil_sekolah: document.getElementById('eduProfil').value,
    alamat: document.getElementById('eduAlamat').value,
    contact_person: document.getElementById('eduCP').value,
    link_pendaftaran: document.getElementById('eduLink').value
  };

  const id = document.getElementById('eduId').value;
  if (id) {
    const idx = eduList.findIndex(e => e.id == id);
    if (idx !== -1) {
      payload.id = eduList[idx].id;
      eduList[idx] = payload;
    }
  } else {
    payload.id = Date.now();
    eduList.push(payload);
  }

  closeAllModals();
  await syncToServer();
}

async function syncToServer() {
  const res = await adminFetch('/pendidikan', {
    method: 'PUT',
    body: JSON.stringify(eduList)
  });
  if (res) {
    showToast('Data pendidikan berhasil disimpan!');
    renderTable();
  }
}
</script>
</body>
</html>`;

fs.writeFileSync(dst, html, 'utf8');
console.log('Created admin/pendidikan.html');
