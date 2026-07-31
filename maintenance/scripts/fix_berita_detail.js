const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'public', 'berita-detail.html');
let content = fs.readFileSync(file, 'utf8');

// Fix 1: Update getSlugFromURL
content = content.replace(
  "return params.get('slug') || '';",
  "return params.get('slug') || params.get('id') || '';"
);

// Fix 2: Update Tautan Cepat (using regex to ignore whitespace/line-endings)
const startMarker = '<div class="footer-links" style="gap:8px">';
const endMarker = '</div>';
const startIndex = content.indexOf(startMarker, content.indexOf('Tautan Cepat'));

if (startIndex !== -1) {
  const innerStart = startIndex + startMarker.length;
  const endIndex = content.indexOf(endMarker, innerStart);
  
  if (endIndex !== -1) {
    const newLinks = `
            <a href="/berita.html#berita" style="font-size:0.86rem; color:var(--text-body); opacity:0.8">📰 Berita</a>
            <a href="/berita.html#pengumuman" style="font-size:0.86rem; color:var(--text-body); opacity:0.8">📌 Pengumuman</a>
            <a href="/berita.html#agenda" style="font-size:0.86rem; color:var(--text-body); opacity:0.8">📅 Agenda</a>
            <a href="/berita.html#artikel" style="font-size:0.86rem; color:var(--text-body); opacity:0.8">📝 Artikel</a>
            <a href="/berita.html#kegiatan" style="font-size:0.86rem; color:var(--text-body); opacity:0.8">🎯 Kegiatan</a>
          `;
    
    content = content.substring(0, innerStart) + newLinks + content.substring(endIndex);
  }
}

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed Tautan Cepat robustly!');
