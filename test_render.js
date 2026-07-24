const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, 'server/data/surat.json');
let allData = [];
try {
  allData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
} catch (e) {
  console.log('Error reading data:', e);
}

try {
  const filtered = allData;
  const html = filtered.map((d) => {
    let statusClass = 'badge bg-amber-100 text-amber-800';
    if(d.status === 'Disetujui') statusClass = 'badge bg-green-100 text-green-800';
    if(d.status === 'Ditolak') statusClass = 'badge bg-red-100 text-red-800';

    return `
    <tr>
      <td style="white-space:nowrap;font-size:0.85rem;color:var(--text-muted)">${new Date(d.created_at).toLocaleString('id-ID')}</td>
      <td style="font-weight:600">${d.nama}</td>
      <td>${d.nik}</td>
      <td>${d.jenis_surat}</td>
      <td>
        ${d.lampiran_ktp ? `<button onclick="openPreview('${d.lampiran_ktp}')" class="badge bg-blue-100 text-blue-800" style="text-decoration:none;margin-bottom:4px;display:inline-block;border:none;cursor:pointer">🖼️ KTP</button><br>` : ''}
        ${d.lampiran ? `<button onclick="openPreview('${d.lampiran}')" class="badge bg-blue-100 text-blue-800" style="text-decoration:none;display:inline-block;border:none;cursor:pointer">📄 Surat RT</button>` : '-'}
      </td>
      <td><span class="${statusClass}">${d.status}</span></td>
      <td>
        <button class="btn-admin btn-light btn-sm-admin" onclick="openEdit(${d.id})">🔍 Proses</button>
        <button class="btn-admin btn-danger btn-sm-admin" onclick="deleteData(${d.id})">🗑️</button>
      </td>
    </tr>
  `}).join('');
  console.log('Success, generated length:', html.length);
} catch (e) {
  console.log('Error in render:', e);
}
