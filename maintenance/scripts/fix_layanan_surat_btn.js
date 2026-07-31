const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, 'public');
const files = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

const badBtn = '<a href="/layanan-surat.html" class="btn btn-outline" style="padding:6px 14px;margin-left:8px;border-color:var(--primary);color:var(--primary);font-size:0.85rem;border-radius:100px">✉️ Layanan Surat</a>';

const goodBtn = '<a href="/layanan-surat.html" style="background:var(--bg-white);color:var(--primary-dark);padding:8px 18px;margin-left:12px;border-radius:100px;font-size:0.85rem;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.15);display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s" onmouseover="this.style.transform=\\\'scale(1.05)\\\'\" onmouseout="this.style.transform=\\\'scale(1)\\\'\" >✉️ Layanan Surat</a>';

files.forEach(file => {
  const filePath = path.join(publicDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes(badBtn)) {
    content = content.split(badBtn).join(goodBtn);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed button in ' + file);
  }
});
console.log('All files processed.');
