const fs = require('fs');
const path = require('path');

const fp = path.join(__dirname, 'create_portal_public.js');
let c = fs.readFileSync(fp, 'utf8');

c = c.replace(/\${formatDate\(p.tanggal\)}/g, '\\${formatDate(p.tanggal)}');
c = c.replace(/\${p.judul}/g, '\\${p.judul}');
c = c.replace(/\${p.ringkasan \|\| ''}/g, '\\${p.ringkasan || \\'\\'}');
c = c.replace(/\${p.konten \?/g, '\\${p.konten ?');
c = c.replace(/\${p.id}/g, '\\${p.id}');
c = c.replace(/`\)\.join/g, '\\`).join');
c = c.replace(/\${new Date\(a.tanggal\).getDate\(\)}/g, '\\${new Date(a.tanggal).getDate()}');
c = c.replace(/\${new Date\(a.tanggal\).toLocaleString\('id-ID', \{month:'short'\}\)}/g, '\\${new Date(a.tanggal).toLocaleString(\\'id-ID\\', {month:\\'short\\'})}');
c = c.replace(/\${a.judul}/g, '\\${a.judul}');
c = c.replace(/\${a.waktu \|\| '-'\}/g, '\\${a.waktu || \\'-\\'}');
c = c.replace(/\${a.lokasi \|\| '-'\}/g, '\\${a.lokasi || \\'-\\'}');
c = c.replace(/\$\{\(a.ringkasan \|\| ''\)\.substring\(0,100\)\}\.\.\./g, '\\${(a.ringkasan || \\'\\').substring(0,100)}...');

// Fix the template literals ` to \`
c = c.replace(/innerHTML = pengumuman\.map\(p => `\n/g, 'innerHTML = pengumuman.map(p => \\`\\n');
c = c.replace(/innerHTML = agenda\.map\(\(a, i\) => `\n/g, 'innerHTML = agenda.map((a, i) => \\`\\n');

fs.writeFileSync(fp, c, 'utf8');
console.log('Fixed escapes in create_portal_public.js');
