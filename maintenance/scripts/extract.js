const fs = require('fs');
let html = '';
try { html = fs.readFileSync('public/admin/surat.html', 'utf8'); }
catch { html = fs.readFileSync('admin/surat.html', 'utf8'); }
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/g);
const script = scriptMatch[scriptMatch.length - 1].replace(/<\/?script>/g, '');
fs.writeFileSync('test_script.js', script);
console.log('wrote test_script.js');
