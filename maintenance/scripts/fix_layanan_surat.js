const fs = require('fs');

// Build clean html for layanan-surat
const txt = fs.readFileSync('public/index.html', 'utf8');
const header = txt.substring(0, txt.indexOf('<!-- ===== HERO SLIDER ===== -->'));
const footer = txt.substring(txt.indexOf('<!-- ===== FOOTER ===== -->'));

const content = `
<section class="section" style="padding-top:120px">
  <div class="container" style="max-width:700px">
    <div class="section-header fade-in text-center">
      <div class="section-tag">Layanan Publik</div>
      <h2 class="section-title">Permohonan Surat Online</h2>
      <p class="section-subtitle">Ajukan permohonan surat pengantar secara online.</p>
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
        <div class="form-group" style="margin-top:16px">
          <label class="form-label" style="font-weight:600;margin-bottom:8px;display:block">Upload Surat Pengantar RT / Dokumen Pendukung (Gambar/PDF) *</label>
          <div style="display:flex;gap:8px">
            <input type="text" id="sLampiran" class="form-control" placeholder="URL file akan muncul di sini..." style="flex:1;padding:12px" required readonly />
            <button type="button" class="btn-hero btn-hero-secondary" onclick="const f=document.createElement('input');f.type='file';f.accept='image/*,.pdf';f.onchange=async()=>{this.textContent='Mengunggah...';const fd=new FormData();fd.append('file',f.files[0]);try{const r=await fetch('/api/upload',{method:'POST',body:fd});const d=await r.json();if(d.url) document.getElementById('sLampiran').value=d.url; else throw new Error();}catch(e){alert('Gagal mengunggah');}this.textContent='📂 Upload Dokumen';};f.click()" style="border:none;cursor:pointer;padding:0 24px">📂 Upload</button>
          </div>
          <p style="font-size:0.8rem;color:var(--text-muted);margin-top:6px">Wajib melampirkan foto Surat Pengantar dari RT/RW setempat yang sudah ditandatangani.</p>
        </div>
        <div style="margin-top:32px">
          <button type="submit" class="btn-hero btn-hero-primary" style="width:100%;justify-content:center;border:none;cursor:pointer" id="btnSubmitSurat">Kirim Permohonan Surat ✉️</button>
        </div>
      </form>
    </div>
  </div>
</section>
`;

const script = `
<script>
async function submitSurat(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSubmitSurat');
  btn.disabled = true;
  btn.textContent = 'Mengirim...';
  const payload = {
    nama: document.getElementById('sNama').value,
    nik: document.getElementById('sNik').value,
    jenis_surat: document.getElementById('sJenis').value,
    keperluan: document.getElementById('sKeperluan').value,
    lampiran: document.getElementById('sLampiran').value
  };
  const res = await API.postSurat(payload);
  if(res) {
    document.getElementById('suratForm').innerHTML = '<div style="text-align:center;padding:20px"><div style="font-size:4rem;margin-bottom:16px">✅</div><h3 style="font-size:1.5rem;font-weight:700;color:var(--text-dark);margin-bottom:12px">Permohonan Berhasil Terkirim!</h3><p style="color:var(--text-muted);line-height:1.6">Permohonan surat Anda sedang kami proses.</p><button onclick="location.reload()" class="btn-hero btn-hero-secondary" style="margin-top:24px;border:none;cursor:pointer">Buat Permohonan Lain</button></div>';
  } else {
    alert('Gagal mengirim permohonan. Cek koneksi Anda.');
    btn.disabled = false;
    btn.textContent = 'Kirim Permohonan Surat ✉️';
  }
}
</script>
`;

let final = header
  .replace(/<title>.*?<\/title>/, '<title>Layanan Surat - Desa Kauman</title>')
  .replace(/<a href="\/index\.html" class="nav-link active">/, '<a href="/index.html" class="nav-link">') + 
  content + footer;

final = final.replace('</body>', script + '</body>');
fs.writeFileSync('public/layanan-surat.html', final);
console.log('Rebuilt layanan-surat.html');
