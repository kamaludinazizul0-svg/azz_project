const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', '..', 'server', 'server.js');
let content = fs.readFileSync(serverFile, 'utf8');

function removeBlock(startStr, endStr) {
  const startIndex = content.indexOf(startStr);
  if (startIndex === -1) return;
  const endIndex = content.indexOf(endStr, startIndex);
  if (endIndex === -1) return;
  content = content.substring(0, startIndex) + content.substring(endIndex + endStr.length);
}

// Remove Mitra Desa block
removeBlock(
  '// ====================== MITRA DESA ======================',
  "// ====================== UPLOAD ======================\n"
);

// Remove Agenda block
removeBlock(
  '// ====================== AGENDA ======================',
  "// ====================== SURAT ======================\n"
);

fs.writeFileSync(serverFile, content, 'utf8');
console.log('Removed unused endpoints successfully!');
