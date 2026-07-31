const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'kenali-desa.html');

const insertLink = '<a href="/kenali-desa.html" class="nav-link">🏘️ Kenali Desa</a>';

let updated = 0;
files.forEach(f => {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');
  
  if (content.includes('kenali-desa.html')) {
    console.log('Already has kenali-desa:', f);
    return;
  }
  
  // Find the profil.html link in the nav-menu and insert after it
  // Pattern: any profil.html nav-link
  const profilPattern = /(<a href="\/profil\.html"[^>]*>[^<]*<\/a>)/g;
  
  let count = 0;
  let newContent = content.replace(profilPattern, (match) => {
    count++;
    return match + '\n      ' + insertLink;
  });
  
  if (count > 0) {
    fs.writeFileSync(fp, newContent, 'utf8');
    updated++;
    console.log('Updated (' + count + ' insertions):', f);
  } else {
    console.log('No profil link found:', f);
  }
});
console.log('Total files updated:', updated);
