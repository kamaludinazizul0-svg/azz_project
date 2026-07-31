const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

// Map filename -> which page is "active"
const activeMap = {
  'index.html':                '/index.html',
  'profil.html':               '/profil.html',
  'pendidikan.html':           '/pendidikan.html',
  'kenali-desa.html':          '/kenali-desa.html',
  'infografis.html':           '/infografis.html',
  'idm.html':                  '/idm.html',
  'berita.html':               '/berita.html',
  'berita-detail.html':        '/berita.html',
  'galeri.html':               '/galeri.html',
  'belanja.html':              '/belanja.html',
  'ppid.html':                 '/ppid.html',
  'layanan-masyarakat.html':   '/layanan-masyarakat.html',
  'layanan-surat.html':        '/layanan-masyarakat.html',
  'listing.html':              '/listing.html',
  'pengaduan.html':            '/pengaduan.html',
  'permohonan-informasi.html': '/ppid.html',
  'pembangunan.html':          '/infografis.html',
  'agenda.html':               '/berita.html',
};

const LAYANAN_STYLE = 'background:var(--primary,#2e7d32);color:#fff;padding:8px 18px;margin-left:12px;border-radius:100px;font-size:0.85rem;font-weight:700;text-decoration:none;white-space:nowrap;box-shadow:0 4px 12px rgba(46,125,50,0.4);display:inline-flex;align-items:center;gap:6px;transition:transform 0.2s,box-shadow 0.2s';
const LAYANAN_OVER = "this.style.transform='scale(1.05)';this.style.boxShadow='0 6px 20px rgba(46,125,50,0.5)'";
const LAYANAN_OUT  = "this.style.transform='scale(1)';this.style.boxShadow='0 4px 12px rgba(46,125,50,0.4)'";

function makeLink(href, icon, label, activePage, isActive) {
  const cls = 'nav-link' + (isActive ? ' active' : '');
  return `<a href="${href}" class="${cls}">${icon} ${label}</a>`;
}

function buildNavbar(activePage) {
  const links = [
    ['/index.html',              '&#127968;', 'Beranda'],
    ['/profil.html',             '&#128203;', 'Profil Desa'],
    ['/pendidikan.html',         '&#127979;', 'Pendidikan'],
    ['/kenali-desa.html',        '&#127960;', 'Kenali Desa'],
    ['/infografis.html',         '&#128202;', 'Infografis'],
    ['/idm.html',                '&#127942;', 'IDM'],
    ['/berita.html',             '&#128240;', 'Portal Desa'],
    ['/galeri.html',             '&#128247;', 'Galeri'],
    ['/listing.html',            '&#128188;', 'UMKM'],
    ['/belanja.html',            '&#128176;', 'APBDesa'],
    ['/ppid.html',               '&#128194;', 'PPID'],
  ];

  const desktopLinks = links.map(([href, icon, label]) => {
    const cls = href === activePage ? 'nav-link active' : 'nav-link';
    return `      <a href="${href}" class="${cls}">${icon} ${label}</a>`;
  }).join('\n');

  const mobileLinks = links.map(([href, icon, label]) => {
    const cls = href === activePage ? 'nav-link active' : 'nav-link';
    return `  <a href="${href}" class="${cls}">${icon} ${label}</a>`;
  }).join('\n');

  const navbar = `<nav class="navbar">
  <div class="nav-container">
    <a href="/" class="nav-brand">
      <img src="/images/logo.png" alt="Logo Desa Kauman" class="nav-logo" />
      <div class="nav-title"><span class="desa-name">Desa Kauman</span><span class="desa-loc">Kab. Jombang, Jawa Timur</span></div>
    </a>
    <div class="nav-menu">
${desktopLinks}
      <a href="/layanan-masyarakat.html" style="${LAYANAN_STYLE}" onmouseover="${LAYANAN_OVER}" onmouseout="${LAYANAN_OUT}">&#127963; Layanan</a>
    </div>
    <div class="nav-burger" id="navBurger"><span></span><span></span><span></span></div>
  </div>
</nav>
<div class="nav-mobile" id="navMobile">
${mobileLinks}
  <a href="/layanan-masyarakat.html" class="nav-link">&#127963; Layanan Masyarakat</a>
</div>`;

  return navbar;
}

// Regex to match entire <nav class="navbar">...</nav><div class="nav-mobile"...>...</div>
// We'll use a two-pass approach: find nav start and nav-mobile end separately
function replaceNavbar(content, activePage) {
  // Match <nav class="navbar"> ... </nav>
  const navRe = /<nav class="navbar">[\s\S]*?<\/nav>/;
  // Match <div class="nav-mobile"...> ... </div>
  const mobileRe = /<div class="nav-mobile"[^>]*>[\s\S]*?<\/div>/;

  const newNavbar = buildNavbar(activePage);

  let result = content;

  // Replace nav + nav-mobile together if they appear consecutively
  const combinedRe = /(<nav class="navbar">[\s\S]*?<\/nav>)\s*(<div class="nav-mobile"[^>]*>[\s\S]*?<\/div>)/;
  if (combinedRe.test(result)) {
    result = result.replace(combinedRe, newNavbar);
    return result;
  }

  // Fallback: replace separately
  if (navRe.test(result)) {
    result = result.replace(navRe, '');
  }
  if (mobileRe.test(result)) {
    result = result.replace(mobileRe, '');
  }

  // Insert after <body>
  result = result.replace(/<body>/, '<body>\n' + newNavbar);
  return result;
}

let updated = 0;
files.forEach(f => {
  const fp = path.join(dir, f);
  const content = fs.readFileSync(fp, 'utf8');

  const activePage = activeMap[f] || '/index.html';
  const newContent = replaceNavbar(content, activePage);

  if (newContent !== content) {
    fs.writeFileSync(fp, newContent, 'utf8');
    updated++;
    console.log('Updated: ' + f + ' (active: ' + activePage + ')');
  } else {
    console.log('No change / no navbar found: ' + f);
  }
});

console.log('\nDone. Total files updated: ' + updated);
