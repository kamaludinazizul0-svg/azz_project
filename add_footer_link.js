const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Update footer links
  if (content.includes('<a href="/ppid.html">→ PPID</a>') && !content.includes('<a href="/pengaduan.html">→ Pengaduan</a>')) {
    content = content.replace(/<a href="\/ppid\.html">→ PPID<\/a>/g, '<a href="/ppid.html">→ PPID</a><a href="/pengaduan.html">→ Pengaduan</a>');
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated footer in ${file}`);
  }
});
console.log('Done');
