const fs = require('fs');
const path = require('path');
const files = fs.readdirSync('admin').filter(f => f.endsWith('.html'));
files.forEach(file => {
  const p = path.join('admin', file);
  let txt = fs.readFileSync(p, 'utf8');
  if (!txt.includes('Layanan Surat')) {
    txt = txt.replace(/<a href="\/admin\/listing\.html"[\s\S]*?<\/a>/, match => match + '\n      <a href="/admin/agenda.html" class="sidebar-link"><span class="icon">📅</span> Agenda Desa</a>\n      \n      <div class="sidebar-section-label">Layanan Publik</div>\n      <a href="/admin/surat.html" class="sidebar-link"><span class="icon">✉️</span> Layanan Surat</a>');
    fs.writeFileSync(p, txt, 'utf8');
    console.log('Updated ' + file);
  }
});
