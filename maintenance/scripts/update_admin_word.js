const fs = require('fs');
let txt = fs.readFileSync('admin/surat.html', 'utf8');

txt = txt.replace(
  "if(d.lampiran.toLowerCase().endsWith('pdf')) {\n      cont.innerHTML = `<iframe src=\"${d.lampiran}\" style=\"width:100%;height:350px;border:none;border-radius:4px\"></iframe>`;\n    } else {\n      cont.innerHTML = `<a href=\"${d.lampiran}\" target=\"_blank\"><img src=\"${d.lampiran}\" style=\"max-width:100%;max-height:350px;border-radius:4px;object-fit:contain\" /></a>`;\n    }",
  `const ext = d.lampiran.toLowerCase().split('.').pop();
    if(ext === 'pdf') {
      cont.innerHTML = \\\`<iframe src="\\\${d.lampiran}" style="width:100%;height:350px;border:none;border-radius:4px"></iframe>\\\`;
    } else if (ext === 'doc' || ext === 'docx') {
      cont.innerHTML = \\\`<a href="\\\${d.lampiran}" target="_blank" class="btn-admin btn-primary-admin" style="text-decoration:none;display:inline-flex;align-items:center;gap:8px">📄 Download/Buka File Word</a>\\\`;
    } else {
      cont.innerHTML = \\\`<a href="\\\${d.lampiran}" target="_blank"><img src="\\\${d.lampiran}" style="max-width:100%;max-height:350px;border-radius:4px;object-fit:contain" /></a>\\\`;
    }`
);

fs.writeFileSync('admin/surat.html', txt);
console.log('Updated admin/surat.html for doc/docx support');
