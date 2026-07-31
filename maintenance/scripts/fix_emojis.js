const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

const replacements = {
  '?? Beranda': '🏠 Beranda',
  '?? Profil Desa': '📋 Profil Desa',
  '?? Infografis': '📊 Infografis',
  '?? IDM': '🏆 IDM',
  '?? Berita': '📰 Berita',
  '?? Listing': '🏪 Listing',
  '?? APBDesa': '💰 APBDesa',
  '?? PPID': '📂 PPID',
  '?? Pemerintahan': '🏛️ Pemerintahan',
  '?? Prestasi': '🏆 Prestasi',
  '??? Pariwisata': '🏞️ Pariwisata',
  '?? UMKM': '🏪 UMKM',
  '??? Infrastruktur': '🏗️ Infrastruktur',
  '?? Kesehatan': '🏥 Kesehatan',
  '?? Cari berita...': '🔍 Cari berita...',
  '?? Jamu Tradisional': '🌿 Jamu Tradisional',
  '?? Wisata': '🏞️ Wisata',
  '?? Kerajinan': '🏺 Kerajinan',
  '?? Cari UMKM/Produk...': '🔍 Cari UMKM/Produk...',
  '?? Cari Dokumen...': '🔍 Cari Dokumen...',
  '?? Peraturan Desa': '📜 Peraturan Desa',
  '?? Laporan Keuangan': '💰 Laporan Keuangan',
  '?? Perencanaan': '📊 Perencanaan',
  '?? Aset Desa': '🏡 Aset Desa',
  '?? Berita Desa Kauman': '📰 Berita Desa Kauman',
  '?? Listing UMKM & Produk Desa': '🏪 Listing UMKM & Produk Desa',
  '?? Indeks Desa Membangun (IDM)': '🏆 Indeks Desa Membangun (IDM)',
  '?? Anggaran Pendapatan dan Belanja Desa (APBDesa)': '💰 Anggaran Pendapatan dan Belanja Desa (APBDesa)',
  '?? PPID - Keterbukaan Informasi Publik': '📂 PPID - Keterbukaan Informasi Publik'
};

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  for (const [bad, good] of Object.entries(replacements)) {
    if (content.includes(bad)) {
      content = content.split(bad).join(good);
      changed = true;
    }
  }
  
  // also fix double question marks just in case
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${file}`);
  }
});
