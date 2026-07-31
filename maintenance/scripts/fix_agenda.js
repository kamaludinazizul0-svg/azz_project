const fs = require('fs');

const txt = fs.readFileSync('public/index.html', 'utf8');
const header = txt.substring(0, txt.indexOf('<!-- ===== HERO SLIDER ===== -->'));
const footer = txt.substring(txt.indexOf('<!-- ===== FOOTER ===== -->'));

const content = `
<main class="main-content" style="padding-top:120px">
  <section class="berita-page-section">
    <div class="container">
      <div class="section-header fade-in">
        <div class="section-tag">Jadwal Kegiatan</div>
        <h2 class="section-title">Agenda Desa</h2>
        <p class="section-subtitle">Daftar kegiatan dan acara yang akan dilaksanakan di Desa Kauman</p>
      </div>
      <div class="grid-agenda" id="agendaGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:24px"></div>
    </div>
  </section>
</main>
`;

const script = `
<script>
document.addEventListener("DOMContentLoaded", async () => {
  const data = await API.agenda();
  const grid = document.getElementById("agendaGrid");
  if(!data || !data.length) { grid.innerHTML="<p>Belum ada agenda terdekat.</p>"; return; }
  grid.innerHTML = data.map(a => 
    '<div class="admin-card" style="padding:24px;border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);border:1px solid var(--border)">' +
      '<div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">' +
        '<div style="width:60px;height:60px;border-radius:16px;background:var(--primary-pale);display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--primary)">' +
          '<span style="font-size:1.5rem;font-weight:800;line-height:1">' + new Date(a.tanggal).getDate() + '</span>' +
          '<span style="font-size:0.75rem;font-weight:600;text-transform:uppercase">' + new Date(a.tanggal).toLocaleString("id-ID", {month:"short"}) + '</span>' +
        '</div>' +
        '<div>' +
          '<h3 style="font-size:1.1rem;font-weight:700;color:var(--text-dark);margin:0 0 4px">' + a.judul + '</h3>' +
          '<span class="badge bg-emerald-100 text-emerald-800" style="font-size:0.7rem">' + (a.status||"Akan Datang") + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="font-size:0.85rem;color:var(--text-muted);margin-bottom:12px;line-height:1.5">' + (a.deskripsi||"") + '</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;font-size:0.85rem;color:var(--text-muted)">' +
        '<div style="display:flex;align-items:center;gap:8px"><span>🕒</span> ' + (a.waktu||"-") + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px"><span>📍</span> ' + (a.lokasi||"-") + '</div>' +
      '</div>' +
    '</div>'
  ).join("");
});
</script>
`;

let final = header
  .replace(/<title>.*?<\/title>/, '<title>Agenda - Desa Kauman</title>')
  .replace(/<a href="\/index\.html" class="nav-link active">/, '<a href="/index.html" class="nav-link">') + 
  content + footer;

final = final.replace('</body>', script + '</body>');
fs.writeFileSync('public/agenda.html', final);
console.log('Rebuilt agenda.html');
