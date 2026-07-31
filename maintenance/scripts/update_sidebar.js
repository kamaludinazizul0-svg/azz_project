const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'admin');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
files.forEach(file => {
  const p = path.join(dir, file);
  let txt = fs.readFileSync(p, 'utf8');
  const rx = /(<div class="sidebar-section-label">Konten Website<\/div>)([\s\S]*?)(<div class="sidebar-section-label">Profil Desa<\/div>)/;
  const match = txt.match(rx);
  if (match) {
    const newTxt = match[1] + `
      <a href="/admin/slider.html" class="sidebar-link"><span class="icon">🖼️</span> Hero Slider</a>
      <a href="/admin/berita.html" class="sidebar-link"><span class="icon">📰</span> Berita</a>
      <a href="/admin/agenda.html" class="sidebar-link"><span class="icon">📅</span> Agenda Desa</a>
      <a href="/admin/galeri.html" class="sidebar-link"><span class="icon">📷</span> Galeri Foto</a>
      <a href="/admin/listing.html" class="sidebar-link"><span class="icon">🏪</span> Listing UMKM</a>
      
      <div class="sidebar-section-label">Layanan Publik</div>
      <a href="/admin/surat.html" class="sidebar-link"><span class="icon">✉️</span> Layanan Surat</a>
      
      ` + match[3];
    txt = txt.replace(rx, newTxt);
    fs.writeFileSync(p, txt, 'utf8');
    console.log('Updated ' + file);
  }
});
