const fs = require('fs');

const txt = fs.readFileSync('public/berita.html', 'utf8');
const header = txt.substring(0, txt.indexOf('<main'));
const footer = txt.substring(txt.indexOf('</main>'));

// 1. Create agenda.html
const agendaHtml = header.replace(/<title>.*?<\/title>/, '<title>Agenda - Desa Kauman</title>').replace(/<meta name="description".*?>/, '')
  .replace('active', '') + 
`<main class="main-content">
  <section class="berita-page-section">
    <div class="container">
      <div class="section-header fade-in">
        <div class="section-tag">Jadwal Kegiatan</div>
        <h2 class="section-title">Agenda Desa</h2>
        <p class="section-subtitle">Daftar kegiatan dan acara yang akan dilaksanakan di Desa Kauman</p>
      </div>
      <div class="grid-agenda" id="agendaGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px"></div>
    </div>
  </section>
</main>` + 
footer.replace('// ===== BERITA PAGE LOGIC =====', `
// ===== AGENDA LOGIC =====
document.addEventListener("DOMContentLoaded", async () => {
  const data = await API.agenda();
  const grid = document.getElementById("agendaGrid");
  if(!data || !data.length) { grid.innerHTML="<p>Belum ada agenda terdekat.</p>"; return; }
  grid.innerHTML = data.map(a => 
    '<div class="admin-card" style="padding:24px;border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);border:1px solid var(--border)">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">' +
        '<div style="width:60px;height:60px;border-radius:16px;background:var(--primary-pale);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--primary)">' +
          '<span style="font-size:1.5rem;font-weight:800;line-height:1">' + new Date(a.tanggal).getDate() + '</span>' +
          '<span style="font-size:0.75rem;font-weight:600;text-transform:uppercase">' + new Date(a.tanggal).toLocaleString("id-ID", {month:"short"}) + '</span>' +
        '</div>' +
        '<div>' +
          '<h3 style="font-size:1.1rem;font-weight:700;color:var(--text-dark);margin:0 0 4px">' + a.judul + '</h3>' +
          '<span class="badge bg-emerald-100 text-emerald-800" style="font-size:0.7rem">' + (a.status||"Akan Datang") + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;line-height:1.5">' + (a.deskripsi||"") + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;font-size:0.85rem;color:var(--text-muted)">' +
        '<div style="display:flex;align-items:center;gap:8px"><span>🕒</span> ' + (a.waktu||"-") + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px"><span>📍</span> ' + (a.lokasi||"-") + '</div>' +
      '</div>' +
    '</div>'
  ).join("");
});`);
fs.writeFileSync('public/agenda.html', agendaHtml);
console.log('Created agenda.html');

// 2. Create layanan-surat.html
const suratHtml = header.replace(/<title>.*?<\/title>/, '<title>Layanan Surat - Desa Kauman</title>').replace(/<meta name="description".*?>/, '')
  .replace('active', '') + 
`<main class="main-content">
  <section class="berita-page-section">
    <div class="container" style="max-width:700px">
      <div class="section-header fade-in text-center">
        <div class="section-tag">Layanan Publik</div>
        <h2 class="section-title">Permohonan Surat Online</h2>
        <p class="section-subtitle">Ajukan permohonan surat pengantar secara online tanpa harus antre di balai desa.</p>
      </div>
      
      <div class="admin-card fade-in" style="padding:32px">
        <form id="suratForm" onsubmit="submitSurat(event)">
          <div class="form-group">
            <label class="form-label" style="font-weight:600;margin-bottom:8px;display:block">Nama Lengkap Sesuai KTP *</label>
            <input type="text" id="sNama" class="form-control" style="width:100%;padding:12px" required />
          </div>
          <div class="form-group" style="margin-top:16px">
            <label class="form-label" style="font-weight:600;margin-bottom:8px;display:block">Nomor Induk Kependudukan (NIK) *</label>
            <input type="text" id="sNik" class="form-control" style="width:100%;padding:12px" pattern="[0-9]{16}" title="NIK harus 16 digit angka" required />
          </div>
          <div class="form-group" style="margin-top:16px">
            <label class="form-label" style="font-weight:600;margin-bottom:8px;display:block">Jenis Surat yang Dimohon *</label>
            <select id="sJenis" class="form-control" style="width:100%;padding:12px" required>
              <option value="">-- Pilih Jenis Surat --</option>
              <option value="Surat Pengantar Domisili">Surat Pengantar Domisili</option>
              <option value="Surat Pengantar SKCK">Surat Pengantar SKCK</option>
              <option value="Surat Keterangan Usaha">Surat Keterangan Usaha (SKU)</option>
              <option value="Surat Keterangan Tidak Mampu">Surat Keterangan Tidak Mampu (SKTM)</option>
              <option value="Surat Keterangan Belum Menikah">Surat Keterangan Belum Menikah</option>
            </select>
          </div>
          <div class="form-group" style="margin-top:16px">
            <label class="form-label" style="font-weight:600;margin-bottom:8px;display:block">Tujuan / Keperluan Membuat Surat</label>
            <textarea id="sKeperluan" class="form-control" style="width:100%;padding:12px" rows="3" placeholder="Misal: Untuk melengkapi berkas melamar pekerjaan..."></textarea>
          </div>
          <div style="margin-top:32px">
            <button type="submit" class="btn-hero btn-hero-primary" style="width:100%;justify-content:center;border:none;cursor:pointer" id="btnSubmitSurat">Kirim Permohonan Surat ✉️</button>
          </div>
        </form>
      </div>
    </div>
  </section>
</main>` + 
footer.replace('// ===== BERITA PAGE LOGIC =====', `
// ===== SURAT LOGIC =====
async function submitSurat(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitSurat');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  
  const payload = {
    nama: document.getElementById('sNama').value,
    nik: document.getElementById('sNik').value,
    jenis_surat: document.getElementById('sJenis').value,
    keperluan: document.getElementById('sKeperluan').value
  };
  
  const res = await API.postSurat(payload);
  if(res) {
    document.getElementById('suratForm').innerHTML = \`
      <div style="text-align:center;padding:20px">
        <div style="font-size:4rem;margin-bottom:16px">✅</div>
        <h3 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin-bottom:12px">Permohonan Berhasil Terkirim!</h3>
        <p style="color:var(--text-muted);line-height:1.6">Permohonan surat Anda sedang kami proses. Silakan datang ke balai desa 1-2 hari kerja ke depan atau tunggu informasi selanjutnya melalui kontak perangkat desa.</p>
        <button onclick="location.reload()" class="btn-hero btn-hero-secondary" style="margin-top:24px;border:none;cursor:pointer">Buat Permohonan Lain</button>
      </div>
    \`;
  } else {
    alert('Terjadi kesalahan. Silakan coba lagi.');
    btn.disabled = false;
    btn.textContent = 'Kirim Permohonan Surat ✉️';
  }
}
`);
fs.writeFileSync('public/layanan-surat.html', suratHtml);
console.log('Created layanan-surat.html');
