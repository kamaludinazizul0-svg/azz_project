const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let updated = 0;
files.forEach(f => {
  const fp = path.join(dir, f);
  let content = fs.readFileSync(fp, 'utf8');
  
  const target = '<a href="/kenali-desa.html" class="nav-link">🏘️ Kenali Desa</a>';
  const replacement = '<a href="/kenali-desa.html">→ Kenali Desa</a>';
  
  if (content.includes(target)) {
    // Replace with correct indentation
    const re = new RegExp('^\\s*<a href="/kenali-desa.html" class="nav-link">🏘️ Kenali Desa</a>', 'm');
    content = content.replace(re, '          <a href="/kenali-desa.html">→ Kenali Desa</a>');
    
    // Also try simple replace just in case
    content = content.replace(target, '<a href="/kenali-desa.html">→ Kenali Desa</a>');
    
    fs.writeFileSync(fp, content, 'utf8');
    console.log('Fixed ' + f);
    updated++;
  }
});

console.log('Total fixed: ' + updated);
