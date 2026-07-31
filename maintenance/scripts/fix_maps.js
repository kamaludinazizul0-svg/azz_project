const fs = require('fs');
const path = require('path');

const mapOverlayCSS = `style="position:relative; width:100%; height:100%;"`;
const mapIframe = `<iframe width="100%" height="100%" style="border:0; border-radius:8px;" loading="lazy" allowfullscreen src="https://maps.google.com/maps?q=\${query}&hl=id&z=16&output=embed"></iframe>`;
const mapButton = `<a href="https://maps.google.com/maps?q=\${query}" target="_blank" style="position:absolute; bottom:15px; left:50%; transform:translateX(-50%); background:#0d6efd; padding:10px 20px; border-radius:30px; box-shadow:0 4px 10px rgba(0,0,0,0.3); font-weight:bold; color:#fff; text-decoration:none; font-size:14px; z-index:10; display:flex; align-items:center; gap:8px; transition:0.3s;" onmouseover="this.style.background='#0b5ed7';this.style.transform='translateX(-50%) translateY(-3px)'" onmouseout="this.style.background='#0d6efd';this.style.transform='translateX(-50%) translateY(0)'"><i class="fas fa-map-marker-alt"></i> Buka Google Maps</a>`;

const replacementString = `const query = "Kantor+Desa+Kauman,+Ngoro,+Jombang,+Jawa+Timur";
    $1 = \`<div ${mapOverlayCSS}>
      ${mapIframe}
      ${mapButton}
    </div>\`;`;


const filesToProcess = [
  'public/index.html',
  'public/profil.html',
  'public/layanan-surat.html',
  'public/agenda.html'
];

for (const file of filesToProcess) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  // Pattern for index.html, layanan-surat.html, agenda.html
  if (content.includes('mapEl.innerHTML = `<iframe')) {
    content = content.replace(/(mapEl\.innerHTML)\s*=\s*`<iframe[^>]+src="https:\/\/maps\.google\.com\/maps\?q=[^"]+"[^>]*><\/iframe>`;/g, replacementString);
    changed = true;
  }
  if (content.includes('mapKontakEl.innerHTML = `<iframe')) {
    content = content.replace(/(mapKontakEl\.innerHTML)\s*=\s*`<iframe[^>]+src="https:\/\/maps\.google\.com\/maps\?q=[^"]+"[^>]*><\/iframe>`;/g, replacementString);
    changed = true;
  }
  // Pattern for profil.html
  if (content.includes("document.getElementById('mapProfil').innerHTML = `<iframe")) {
    content = content.replace(/(document\.getElementById\('mapProfil'\)\.innerHTML)\s*=\s*`<iframe[^>]+src="https:\/\/maps\.google\.com\/maps\?q=[^"]+"[^>]*><\/iframe>`;/g, replacementString);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed maps in ' + file);
  }
}
