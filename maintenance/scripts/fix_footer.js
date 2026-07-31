const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

const standardFooter = `<footer class="footer">
  <div class="container">
    <div class="footer-grid">
      <div class="footer-brand">
        <div class="footer-logo">
          <img src="/images/logo.png" alt="Logo Desa Kauman" />
          <div class="footer-logo-text">
            <span class="name" data-desa-nama>Desa Kauman</span>
            <span class="loc">Kec. Ngoro, Kab. Jombang</span>
          </div>
        </div>
        <p class="footer-desc">Website resmi Desa Kauman, Kecamatan Ngoro, Kabupaten Jombang, Jawa Timur. Kampung Jamu Tradisional yang terus berkembang menuju desa digital.</p>
        <div class="footer-sosmed">
          <a href="#" data-sosmed-fb title="Facebook">f</a>
          <a href="#" data-sosmed-ig title="Instagram">ig</a>
          <a href="#" data-sosmed-yt title="YouTube">yt</a>
        </div>
      </div>
      <div>
        <h4 class="footer-col-title">MENU</h4>
        <div class="footer-links">
          <a href="/index.html">→ Beranda</a>
          <a href="/profil.html">→ Profil Desa</a>
          <a href="/infografis.html">→ Infografis</a>
          <a href="/idm.html">→ IDM</a>
          <a href="/berita.html">→ Berita</a>
        </div>
      </div>
      <div>
        <h4 class="footer-col-title">LAYANAN</h4>
        <div class="footer-links">
          <a href="/listing.html">→ Listing UMKM</a>
          <a href="/belanja.html">→ APBDesa</a>
          <a href="/ppid.html">→ PPID</a>
          <a href="/pengaduan.html">→ Pengaduan</a>
          <a href="/admin">→ Admin Panel</a>
        </div>
      </div>
      <div>
        <h4 class="footer-col-title">KONTAK</h4>
        <div class="footer-contact">
          <div class="footer-contact-item">
            <span>📍</span>
            <span data-desa-alamat>Jl. Kauman No. 01, Desa Kauman, Kec. Ngoro, Kab. Jombang, Jawa Timur 61473</span>
          </div>
          <div class="footer-contact-item">
            <span>📞</span>
            <span data-desa-telp>(0321) 123456</span>
          </div>
          <div class="footer-contact-item">
            <span>✉️</span>
            <a href="#" data-desa-email style="color:inherit">desaKauman@jombangkab.go.id</a>
          </div>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <p>© 2025 Pemerintah Desa Kauman, Kecamatan Ngoro, Kabupaten Jombang. Hak Cipta Dilindungi.</p>
    </div>
  </div>
</footer>`;

function updateFooterInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the start of the footer
  const startIndex = content.indexOf('<footer class="footer">');
  if (startIndex === -1) {
    console.log(`No footer found in ${path.basename(filePath)}`);
    return;
  }
  
  // Find the end of the footer
  const endIndex = content.indexOf('</footer>', startIndex) + '</footer>'.length;
  if (endIndex === -1 + '</footer>'.length) {
    console.log(`No closing footer tag found in ${path.basename(filePath)}`);
    return;
  }
  
  const before = content.substring(0, startIndex);
  const after = content.substring(endIndex);
  
  const newContent = before + standardFooter + after;
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Updated footer in ${path.basename(filePath)}`);
}

const files = fs.readdirSync(publicDir);
files.forEach(file => {
  if (file.endsWith('.html')) {
    const filePath = path.join(publicDir, file);
    updateFooterInFile(filePath);
  }
});

console.log('All footers updated.');
