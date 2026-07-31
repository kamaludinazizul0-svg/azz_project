const fs = require('fs');
const path = require('path');

const beritaPath = path.join(__dirname, 'server', 'data', 'berita.json');
const agendaPath = path.join(__dirname, 'server', 'data', 'agenda.json');

try {
  let berita = [];
  if (fs.existsSync(beritaPath)) {
    berita = JSON.parse(fs.readFileSync(beritaPath, 'utf8'));
  }

  let agenda = [];
  if (fs.existsSync(agendaPath)) {
    agenda = JSON.parse(fs.readFileSync(agendaPath, 'utf8'));
  }

  const migratedAgenda = agenda.map(a => ({
    id: a.id || Date.now() + Math.floor(Math.random() * 1000),
    kategori: 'Agenda',
    judul: a.judul,
    tanggal: a.tanggal,
    waktu: a.waktu,
    lokasi: a.lokasi,
    ringkasan: a.deskripsi,
    konten: a.deskripsi, // Fallback
    penulis: 'Admin Desa',
    dilihat: 0,
    aktif: a.aktif,
    slug: a.judul.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  }));

  const newBerita = [...berita, ...migratedAgenda];

  fs.writeFileSync(beritaPath, JSON.stringify(newBerita, null, 2), 'utf8');
  console.log(`Migrated ${migratedAgenda.length} agendas into berita.json.`);

  // Now delete agenda.json and admin/agenda.html
  fs.unlinkSync(agendaPath);
  console.log('Deleted agenda.json');

  const adminAgendaPath = path.join(__dirname, 'admin', 'agenda.html');
  if (fs.existsSync(adminAgendaPath)) {
    fs.unlinkSync(adminAgendaPath);
    console.log('Deleted admin/agenda.html');
  }

} catch (err) {
  console.error(err);
}
