const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, 'public');
const adminDir = path.join(__dirname, 'admin');

// Update public HTMLs
fs.readdirSync(publicDir).forEach(file => {
  if (file.endsWith('.html')) {
    const p = path.join(publicDir, file);
    let c = fs.readFileSync(p, 'utf8');
    // regex pattern matching the IDM link
    const idmRegex = /<a href="\/idm\.html" class="nav-link">.*?<\/a>/g;
    c = c.replace(idmRegex, match => `${match}\n  <a href="/peta-desa.html" class="nav-link">&#128506; Peta Desa</a>`);
    fs.writeFileSync(p, c);
  }
});

// Update admin HTMLs
fs.readdirSync(adminDir).forEach(file => {
  if (file.endsWith('.html') && file !== 'gis.html') {
    const p = path.join(adminDir, file);
    let c = fs.readFileSync(p, 'utf8');
    const galeriRegex = /<a href="galeri\.html">.*?<\/a>/g;
    c = c.replace(galeriRegex, match => `${match}\n      <a href="gis.html">🗺️ Peta GIS</a>`);
    fs.writeFileSync(p, c);
  }
});

console.log("Navbar updated");
