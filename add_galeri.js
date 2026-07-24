const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');

// Create public/galeri.html based on public/berita.html
const beritaHtml = fs.readFileSync(path.join(publicDir, 'berita.html'), 'utf8');

// We will modify the HTML content to be suitable for galeri
let galeriHtml = beritaHtml.replace(
  /<title>.*?<\/title>/,
  '<title>Galeri Desa Kauman - Kecamatan Ngoro, Kabupaten Jombang</title>'
);

galeriHtml = galeriHtml.replace(
  /<meta name="description" content=".*?" \/>/,
  '<meta name="description" content="Galeri foto Desa Kauman, Kecamatan Ngoro, Kabupaten Jombang." />'
);

// Remove filter tabs and toolbar, replace content with a gallery grid
const galeriSection = `
<section class="berita-page-section">
  <div class="container">
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 24px;" id="galeriGrid">
      <div style="text-align:center; padding: 40px; grid-column: 1 / -1; color: var(--text-muted)">Memuat galeri...</div>
    </div>
  </div>
</section>

<script>
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      const res = await fetch('/api/galeri');
      const data = await res.json();
      const grid = document.getElementById('galeriGrid');
      
      if (!data || data.length === 0) {
        grid.innerHTML = '<div style="text-align:center; padding: 40px; grid-column: 1 / -1; color: var(--text-muted)">Belum ada foto di galeri.</div>';
        return;
      }
      
      grid.innerHTML = data.map(item => \`
        <div class="card" style="overflow:hidden; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <img src="\${item.url}" alt="\${item.judul}" style="width:100%; height:200px; object-fit:cover;" />
          <div style="padding: 16px;">
            <h3 style="font-size: 1.1rem; font-weight: 600; margin: 0 0 8px;">\${item.judul || 'Tanpa Judul'}</h3>
            <p style="font-size: 0.9rem; color: var(--text-muted); margin: 0;">\${item.deskripsi || ''}</p>
          </div>
        </div>
      \`).join('');
    } catch (e) {
      console.error(e);
      document.getElementById('galeriGrid').innerHTML = '<div style="text-align:center; padding: 40px; grid-column: 1 / -1; color: red">Gagal memuat galeri.</div>';
    }
  });
</script>
`;

// Replace everything between <!-- ===== BERITA SECTION ===== --> and <!-- ===== FOOTER ===== --> with the new section
const headerReplace = `
<div class="page-header">
  <div class="container">
    <div class="breadcrumb">
      <a href="/index.html">🏠 Beranda</a>
      <span>></span>
      <span>Galeri</span>
    </div>
    <h1>📷 Galeri Desa Kauman</h1>
    <p>Dokumentasi kegiatan dan potensi wisata Desa Kauman</p>
  </div>
</div>
`;

// Find where to replace
galeriHtml = galeriHtml.replace(
  /<!-- ===== PAGE HEADER ===== -->[\s\S]*?<!-- ===== FOOTER ===== -->/m,
  "<!-- ===== PAGE HEADER ===== -->\n" + headerReplace + "\n<!-- ===== GALERI SECTION ===== -->\n" + galeriSection + "\n<!-- ===== FOOTER ===== -->"
);

// Make sure to remove any other script blocks that might conflict
galeriHtml = galeriHtml.replace(/<script>\s*\/\/ ===== BERITA PAGE LOGIC =====[\s\S]*?<\/script>/m, '');

fs.writeFileSync(path.join(publicDir, 'galeri.html'), galeriHtml, 'utf8');
console.log('Created galeri.html');

// Add "Galeri" link to the navbar of all public HTML files
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Insert into nav-menu right before 🏪 Listing or 💰 APBDesa if Listing is not present
  if (!content.includes('href="/galeri.html"')) {
    content = content.replace(/(<a href="\/listing\.html".*?>🏪 Listing<\/a>)/g, '<a href="/galeri.html" class="nav-link">📷 Galeri</a>\n      $1');
    changed = true;
  }
  
  // Update footer links
  if (!content.includes('>→ Galeri<') && content.includes('>→ Berita<')) {
    content = content.replace(/(<a href="\/berita\.html".*?>→ Berita<\/a>)/g, '$1\n          <a href="/galeri.html">→ Galeri</a>');
    changed = true;
  }

  // Active state for galeri.html
  if (file === 'galeri.html') {
    content = content.replace(/class="nav-link">📷 Galeri<\/a>/g, 'class="nav-link active">📷 Galeri</a>');
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated navbar/footer in ${file}`);
  }
});

console.log('Done');
