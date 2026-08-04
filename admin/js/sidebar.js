// ===== SHARED SIDEBAR COMPONENT =====
// Dipanggil di setiap halaman admin untuk inject sidebar yang konsisten

function getSidebarHTML(activePage) {
  return `
  <div class="sidebar-brand">
    <img src="/images/logo.png" alt="Logo" onerror="this.style.display='none'" />
    <div class="sidebar-brand-text">
      <span class="name">Desa Kauman</span>
      <span class="role">Panel Administrasi</span>
    </div>
  </div>
  <nav class="sidebar-nav">
    <div class="sidebar-section-label">Umum</div>
    <a href="/admin/dashboard.html" class="sidebar-link ${activePage==='dashboard'?'active':''}">
      <span class="icon">📊</span> Dashboard
    </a>

    <div class="sidebar-section-label">Konten Website</div>
    <a href="/admin/slider.html" class="sidebar-link ${activePage==='slider'?'active':''}">
      <span class="icon">🖼️</span> Hero Slider
    </a>
    <a href="/admin/berita.html" class="sidebar-link ${activePage==='berita'?'active':''}">
      <span class="icon">📰</span> Portal Desa
    </a>

    <a href="/admin/galeri.html" class="sidebar-link ${activePage==='galeri'?'active':''}">
      <span class="icon">📷</span> Galeri Foto
    </a>
    <a href="/admin/listing.html" class="sidebar-link ${activePage==='listing'?'active':''}">
      <span class="icon">🏪</span> Listing UMKM
    </a>
    <a href="/admin/program.html" class="sidebar-link ${activePage==='program'?'active':''}">
      <span class="icon">🎯</span> Program Prioritas
    </a>


    <div class="sidebar-section-label">Layanan Publik</div>
    <a href="/admin/surat.html" class="sidebar-link ${activePage==='surat'?'active':''}">
      <span class="icon">✉️</span> Permohonan Surat
    </a>
    <a href="/admin/permohonan-info.html" class="sidebar-link ${activePage==='permohonan-info'?'active':''}">
      <span class="icon">ℹ️</span> Permohonan Info
    </a>
    <a href="/admin/pengaduan.html" class="sidebar-link ${activePage==='pengaduan'?'active':''}">
      <span class="icon">📢</span> Layanan Pengaduan
    </a>

    <div class="sidebar-section-label">Profil Desa</div>
    <a href="/admin/profil-desa.html" class="sidebar-link ${activePage==='profil-desa'?'active':''}">
      <span class="icon">🏡</span> Profil Desa
    </a>
    <a href="/admin/pendidikan.html" class="sidebar-link ${activePage==='pendidikan'?'active':''}">
      <span class="icon">🎓</span> Pendidikan
    </a>
    <a href="/admin/kenali-desa.html" class="sidebar-link ${activePage==='kenali-desa'?'active':''}">
      <span class="icon">🏘️</span> Kenali Desa
    </a>
    <a href="/admin/perangkat.html" class="sidebar-link ${activePage==='perangkat'?'active':''}">
      <span class="icon">👥</span> Perangkat Desa
    </a>
    <a href="/admin/penduduk.html" class="sidebar-link ${activePage==='penduduk'?'active':''}">
      <span class="icon">📊</span> Data Penduduk
    </a>
    <a href="/admin/statistik.html" class="sidebar-link ${activePage==='statistik'?'active':''}">
      <span class="icon">📈</span> Statistik Tambahan
    </a>
    <a href="/admin/mitra.html" class="sidebar-link ${activePage==='mitra'?'active':''}">
      <span class="icon">🤝</span> Mitra Desa
    </a>
    <a href="/admin/agenda.html" class="sidebar-link ${activePage==='agenda'?'active':''}">
      <span class="icon">📅</span> Agenda Kegiatan
    </a>

    <div class="sidebar-section-label">Keuangan &amp; Administrasi</div>
    <a href="/admin/apbdesa.html" class="sidebar-link ${activePage==='apbdesa'?'active':''}">
      <span class="icon">💰</span> APBDesa
    </a>
    <a href="/admin/idm.html" class="sidebar-link ${activePage==='idm'?'active':''}">
      <span class="icon">🏆</span> Data IDM
    </a>
    <a href="/admin/ppid.html" class="sidebar-link ${activePage==='ppid'?'active':''}">
      <span class="icon">📂</span> Dokumen PPID
    </a>

    <div class="sidebar-section-label">Pengaturan</div>
    <a href="/admin/pengaturan.html" class="sidebar-link ${activePage==='pengaturan'?'active':''}">
      <span class="icon">⚙️</span> Pengaturan
    </a>
    <a href="/admin/log-aktivitas.html" class="sidebar-link ${activePage==='log-aktivitas'?'active':''}">
      <span class="icon">📖</span> Log Aktivitas
    </a>
  </nav>
  <div class="sidebar-footer">
    <div class="sidebar-user">
      <div class="sidebar-user-avatar" data-admin-initial>A</div>
      <div class="sidebar-user-info">
        <span class="uname" data-admin-nama>Administrator</span>
        <span class="role">Admin</span>
      </div>
    </div>
    <div style="display:flex;gap:8px">
      <a href="/" target="_blank" class="btn-admin btn-light btn-sm-admin" style="flex:1;justify-content:center;font-size:0.78rem">🌐 Website</a>
      <button class="btn-admin btn-light btn-sm-admin" data-logout style="flex:1">🚪 Keluar</button>
    </div>
  </div>
  `;
}

// Auto-inject sidebar jika ada elemen #sidebar
document.addEventListener('DOMContentLoaded', function() {
  const sidebar = document.getElementById('sidebar');
  if (sidebar && sidebar.dataset.page) {
    sidebar.innerHTML = getSidebarHTML(sidebar.dataset.page);
  }
});
