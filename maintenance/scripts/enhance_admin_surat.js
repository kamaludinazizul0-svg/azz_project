const fs = require('fs');
let txt = fs.readFileSync('admin/surat.html', 'utf8');

txt = txt.replace('<th>Jenis Surat</th><th>Status</th>', '<th>Jenis Surat</th><th>Lampiran</th><th>Status</th>');

txt = txt.replace('<td>${d.jenis_surat}</td>\n      <td><span class="${statusClass}">${d.status}</span></td>', 
'<td>${d.jenis_surat}</td>\n      <td>${d.lampiran ? `<a href="${d.lampiran}" target="_blank" class="badge bg-blue-100 text-blue-800" style="text-decoration:none">📄 Buka File</a>` : `-`}</td>\n      <td><span class="${statusClass}">${d.status}</span></td>');

txt = txt.replace('<div style="display:grid;grid-template-columns:120px 1fr;gap:8px;margin-bottom:4px"><span style="color:var(--text-muted)">Lampiran RT:</span><strong><a href="#" id="detLampiran" target="_blank" style="color:var(--primary);text-decoration:underline">Lihat Lampiran</a></strong></div>', 
'<div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px"><span style="color:var(--text-muted);display:block;margin-bottom:8px;font-weight:600">Dokumen Lampiran Pengantar RT:</span><div id="previewLampiranContainer" style="background:#f9f9f9;border:1px solid var(--border);border-radius:8px;padding:8px;text-align:center;min-height:100px;display:flex;align-items:center;justify-content:center"><span style="color:var(--text-muted)">Memuat lampiran...</span></div></div>');

txt = txt.replace("document.getElementById('detLampiran').href = d.lampiran;\n    document.getElementById('detLampiran').textContent = 'Lihat Dokumen / Foto';\n    document.getElementById('detLampiran').style.display = 'inline-block';", 
"const cont = document.getElementById('previewLampiranContainer');\n    cont.style.display = 'block';\n    if(d.lampiran.toLowerCase().endsWith('pdf')) {\n      cont.innerHTML = `<iframe src=\"${d.lampiran}\" style=\"width:100%;height:350px;border:none;border-radius:4px\"></iframe>`;\n    } else {\n      cont.innerHTML = `<a href=\"${d.lampiran}\" target=\"_blank\"><img src=\"${d.lampiran}\" style=\"max-width:100%;max-height:350px;border-radius:4px;object-fit:contain\" /></a>`;\n    }");

txt = txt.replace("document.getElementById('detLampiran').style.display = 'none';", 
"document.getElementById('previewLampiranContainer').style.display = 'none';");

fs.writeFileSync('admin/surat.html', txt);
console.log('Updated admin/surat.html');
