const fs = require('fs');
const path = require('path');
const adminDir = path.join(__dirname, 'admin');

const pages = [
  { file: 'dashboard.html', page: 'dashboard' },
  { file: 'slider.html', page: 'slider' },
  { file: 'berita.html', page: 'berita' },
  { file: 'agenda.html', page: 'agenda' },
  { file: 'galeri.html', page: 'galeri' },
  { file: 'listing.html', page: 'listing' },
  { file: 'program.html', page: 'program' },
  { file: 'surat.html', page: 'surat' },
  { file: 'profil-desa.html', page: 'profil-desa' },
  { file: 'perangkat.html', page: 'perangkat' },
  { file: 'penduduk.html', page: 'penduduk' },
  { file: 'mitra.html', page: 'mitra' },
  { file: 'apbdesa.html', page: 'apbdesa' },
  { file: 'idm.html', page: 'idm' },
  { file: 'ppid.html', page: 'ppid' },
  { file: 'pengaturan.html', page: 'pengaturan' },
];

let updated = 0;
let skipped = 0;

pages.forEach(({ file, page }) => {
  const filePath = path.join(adminDir, file);
  if (!fs.existsSync(filePath)) {
    console.log('SKIP (not found):', file);
    skipped++;
    return;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already using data-page attribute
  if (content.includes('data-page=')) {
    console.log('ALREADY UPDATED:', file);
    return;
  }

  // Replace the aside element (sidebar) with a clean one using data-page
  const startTag = '<aside class="sidebar" id="sidebar">';
  const endTag = '</aside>';
  const startIdx = content.indexOf(startTag);
  
  if (startIdx === -1) {
    console.log('PATTERN NOT FOUND:', file);
    skipped++;
    return;
  }

  const endIdx = content.indexOf(endTag, startIdx);
  if (endIdx === -1) {
    console.log('END TAG NOT FOUND:', file);
    skipped++;
    return;
  }

  const newAside = `<aside class="sidebar" id="sidebar" data-page="${page}"></aside>`;
  content = content.substring(0, startIdx) + newAside + content.substring(endIdx + endTag.length);

  // Add sidebar.js script before admin.js if not already there
  if (!content.includes('sidebar.js')) {
    content = content.replace(
      '<script src="/admin/js/admin.js"></script>',
      '<script src="/admin/js/sidebar.js"></script>\n<script src="/admin/js/admin.js"></script>'
    );
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('UPDATED:', file);
  updated++;
});

console.log('\nTotal updated:', updated, 'Skipped:', skipped);
