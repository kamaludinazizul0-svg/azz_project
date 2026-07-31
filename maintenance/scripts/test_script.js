
let allData = [];
document.addEventListener('DOMContentLoaded', loadData);

async function loadData() {
  allData = await adminFetch('/surat') || [];
  renderTable();
}

function filterData() { renderTable(); }

function renderTable() {
  const tbody = document.getElementById('dataTable');
  const term = document.getElementById('searchInput').value.toLowerCase();
  const filtered = allData.filter(d => (d.nama||'').toLowerCase().includes(term) || (d.nik||'').includes(term));
  
  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted)">Belum ada permohonan surat masuk.</td></tr>';
    return;
  }
  
  tbody.innerHTML = filtered.map((d) => {
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
}

function openPreview(url) {
  const cont = document.getElementById('universalPreviewContainer');
  cont.innerHTML = '⏳ Memuat...';
  document.getElementById('previewModal').classList.add('active');
  const ext = url.toLowerCase().split('.').pop();
  if(ext === 'pdf') {
    cont.innerHTML = `<iframe src="${url}" style="width:100%;height:600px;border:none;border-radius:4px"></iframe>`;
  } else if (ext === 'docx') {
    fetch(url).then(r => r.arrayBuffer()).then(buf => mammoth.convertToHtml({arrayBuffer: buf})).then(res => {
      cont.innerHTML = `<div style="background:#fff;padding:40px;text-align:left;height:600px;overflow-y:auto;border-radius:4px;border:1px solid #ddd;color:#333;width:100%">${res.value}</div>`;
    }).catch(e => {
      cont.innerHTML = `<div style="color:red">Gagal memuat file Word. File mungkin rusak.</div>`;
    });
  } else if (ext === 'doc') {
    cont.innerHTML = `<div style="color:var(--text-muted)">File dengan format <b>.doc</b> (format lama) tidak dapat dipreview langsung di browser.<br><br>Untuk melihatnya, silakan <a href="${url}" target="_blank" class="btn-admin btn-primary-admin" style="display:inline-block;margin-top:16px;text-decoration:none">Unduh File Word</a><br><br><i>Saran: Minta warga gunakan format <b>.docx</b> atau <b>.pdf</b> agar bisa langsung tampil.</i></div>`;
  } else {
    cont.innerHTML = `<img src="${url}" style="max-width:100%;max-height:600px;border-radius:4px;object-fit:contain" />`;
  }
}

let currentSurat = null;
function openEdit(id) {
  const d = allData.find(x => x.id == id);
  if(!d) return;
  currentSurat = d;
  document.getElementById('editId').value = d.id;
  document.getElementById('detNama').textContent = d.nama;
  document.getElementById('detNik').textContent = d.nik;
  document.getElementById('detAlamat').textContent = d.alamat || '-';
  document.getElementById('detJenis').textContent = d.jenis_surat;
  document.getElementById('detKeperluan').textContent = d.keperluan || '-';

  const renderLampiran = (url, contId) => {
    const cont = document.getElementById(contId);
    if(url) {
      cont.style.display = 'block';
      const ext = url.toLowerCase().split('.').pop();
      if(ext === 'pdf') {
        cont.innerHTML = `<iframe src="${url}" style="width:100%;height:350px;border:none;border-radius:4px"></iframe>`;
      } else if (ext === 'docx') {
        cont.innerHTML = `<div style="text-align:center;padding:20px;">⏳ Memuat file Word...</div>`;
        fetch(url)
          .then(r => r.arrayBuffer())
          .then(buf => mammoth.convertToHtml({arrayBuffer: buf}))
          .then(res => {
            cont.innerHTML = `<div style="background:#fff;padding:20px;text-align:left;height:350px;overflow-y:auto;border-radius:4px;border:1px solid #ddd;color:#333;">${res.value}</div>`;
          })
          .catch(e => {
            cont.innerHTML = `<div style="color:red;padding:20px">Gagal memuat file Word. <a href="${url}" target="_blank">Download file</a></div>`;
          });
      } else if (ext === 'doc') {
        cont.innerHTML = `<div style="padding:20px;color:var(--text-muted)">File .doc lawas tidak bisa dipreview. <a href="${url}" target="_blank" class="btn-admin btn-primary-admin" style="text-decoration:none;display:inline-block;margin-top:8px">📄 Download File Word</a></div>`;
      } else {
        cont.innerHTML = `<a href="${url}" target="_blank"><img src="${url}" style="max-width:100%;max-height:350px;border-radius:4px;object-fit:contain" /></a>`;
      }
    } else {
      cont.style.display = 'none';
    }
  };

  renderLampiran(d.lampiran_ktp, 'previewLampiranKtpContainer');
  renderLampiran(d.lampiran, 'previewLampiranContainer');
  document.getElementById('detTgl').textContent = new Date(d.created_at).toLocaleString('id-ID');
  
  document.getElementById('fStatus').value = d.status || 'Menunggu';
  document.getElementById('fCatatan').value = d.catatan || '';
  
  document.getElementById('btnPrint').style.display = (d.status === 'Disetujui') ? 'block' : 'none';
  
  document.getElementById('formModal').classList.add('active');
}

async function saveData(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const payload = {
    status: document.getElementById('fStatus').value,
    catatan: document.getElementById('fCatatan').value
  };
  const res = await adminFetch(`/surat/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  if(res) {
    showToast('Status surat berhasil diperbarui!');
    closeModal('formModal');
    loadData();
  }
}

async function deleteData(id) {
  if(!confirm('Hapus permohonan surat ini secara permanen?')) return;
  const res = await adminFetch(`/surat/${id}`, { method: 'DELETE' });
  if(res) {
    showToast('Permohonan dihapus');
    loadData();
  }
}

function printSurat() {
  if(!currentSurat) return;
  const printArea = document.getElementById('printArea');
  
  // Format tanggal surat
  const tgl = new Date().toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'});
  
  printArea.innerHTML = `
    <div style="text-align:center;border-bottom:3px solid #000;padding-bottom:20px;margin-bottom:30px">
      <h2 style="margin:0;font-size:24px">PEMERINTAH KABUPATEN JOMBANG</h2>
      <h3 style="margin:5px 0 0;font-size:20px">KECAMATAN NGORO</h3>
      <h1 style="margin:5px 0 0;font-size:28px">KANTOR KEPALA DESA KAUMAN</h1>
      <p style="margin:5px 0 0;font-size:14px">Jl. Kauman No. 01, Ngoro, Jombang - Kode Pos: 61473</p>
    </div>
    
    <div style="text-align:center;margin-bottom:30px">
      <h3 style="margin:0;text-decoration:underline;text-transform:uppercase">${currentSurat.jenis_surat}</h3>
      <p style="margin:5px 0 0">Nomor: 470 / &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; / 415.XX / ${new Date().getFullYear()}</p>
    </div>
    
    <p style="text-align:justify;line-height:1.6">Yang bertanda tangan di bawah ini, Kepala Desa Kauman, Kecamatan Ngoro, Kabupaten Jombang, menerangkan dengan sebenarnya bahwa:</p>
    
    <table style="width:100%;margin:20px 0 20px 30px;line-height:1.6">
      <tr><td style="width:200px">Nama Lengkap</td><td style="width:10px">:</td><td><strong>${currentSurat.nama}</strong></td></tr>
      <tr><td>NIK</td><td>:</td><td>${currentSurat.nik}</td></tr>
      <tr><td>Alamat</td><td>:</td><td>${currentSurat.alamat || '-'}</td></tr>
      <tr><td>Keperluan</td><td>:</td><td>${currentSurat.keperluan || '-'}</td></tr>
    </table>
    
    <p style="text-align:justify;line-height:1.6">Orang tersebut benar-benar penduduk Desa Kauman dan surat keterangan ini dibuat untuk melengkapi persyaratan administrasi yang bersangkutan.</p>
    <p style="text-align:justify;line-height:1.6">Demikian surat keterangan ini dibuat agar dapat dipergunakan sebagaimana mestinya.</p>
    
    <div style="margin-top:60px;float:right;text-align:center;width:300px">
      <p style="margin:0 0 80px">Kauman, ${tgl}<br>Kepala Desa Kauman</p>
      <p style="margin:0;font-weight:bold;text-decoration:underline">________________________</p>
    </div>
  `;
  window.print();
}
