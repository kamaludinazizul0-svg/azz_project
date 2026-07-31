const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Check if it's missing layanan-surat.html in nav-menu or nav-mobile
  if (!content.includes('layanan-surat.html')) {
    // Regex to find PPID link and add Layanan Surat after it
    // Match <a href="/ppid.html" ... >...PPID</a>
    
    // We should differentiate between the one in nav-menu and the one in nav-mobile.
    content = content.replace(/(<a href="\/ppid\.html"[^>]*>.*?PPID<\/a>)/g, (match, p1, offset, string) => {
      // If it's before 'nav-mobile', it's in nav-menu
      if (offset < string.indexOf('nav-mobile')) {
         return match + '\n      <a href="/layanan-surat.html" class="btn btn-outline" style="padding:6px 14px;margin-left:8px;border-color:var(--primary);color:var(--primary);font-size:0.85rem;border-radius:100px">✉️ Layanan Surat</a>';
      } else {
         return match + '\n  <a href="/layanan-surat.html" class="nav-link">✉️ Layanan Surat</a>';
      }
    });
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed navbar in ${file}`);
  }
});
console.log('Done');
