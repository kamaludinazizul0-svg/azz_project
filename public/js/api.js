// ===== API Helper =====
const API_BASE = '/api';

async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    // Graceful degradation fallback
    if (endpoint.includes('berita') || endpoint.includes('penduduk')) {
      return { data: [], total: 0 };
    } else if (endpoint.includes('desa')) {
      return { nama: "Desa", kontak: {}, dusun_detail: [], statistik: {} };
    }
    return [];
  }
}

const API = {
  desa: () => apiFetch('/desa'),
  penduduk: () => apiFetch('/penduduk'),
  slider: () => apiFetch('/slider'),
  perangkat: () => apiFetch('/perangkat'),
  berita: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/berita${q ? '?' + q : ''}`);
  },
  beritaDetail: (slug) => apiFetch(`/berita/${slug}`),
  listing: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/listing${q ? '?' + q : ''}`);
  },
  apbdesa: () => apiFetch('/apbdesa'),
  idm: () => apiFetch('/idm'),
  ppid: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/ppid${q ? '?' + q : ''}`);
  },
  galeri: () => apiFetch('/galeri'),
  agenda: () => apiFetch('/agenda'),
  postSurat: (body) => apiFetch('/surat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  postPermohonanInfo: (body) => apiFetch('/permohonan-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }),
  postPengaduan: (body) => apiFetch('/pengaduan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
};

// ===== Format helpers =====
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
function formatRupiah(num) {
  if (num === undefined || num === null || num === '') return 'Rp 0';
  const parts = Number(num).toFixed(2).split('.');
  let str = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (parts[1] && parts[1] !== '00') {
    str += ',' + parts[1];
  }
  return 'Rp ' + str;
}
function timeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = (now - d) / 1000;
  if (diff < 60) return 'Baru saja';
  if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
  if (diff < 86400) return Math.floor(diff / 3600) + ' jam lalu';
  if (diff < 2592000) return Math.floor(diff / 86400) + ' hari lalu';
  return formatDate(dateStr);
}

// ===== Image placeholder =====
function imgPlaceholder(text = 'Gambar', color = '#2e7d32') {
  const colors = ['#2e7d32', '#f57f17', '#00acc1', '#7b1fa2', '#c62828'];
  const c = colors[Math.abs(text.charCodeAt(0) % colors.length)];
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect fill='${c}' opacity='0.15' width='400' height='300'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='${c}' opacity='0.6'>${text}</text></svg>`)}`;
}

function safeImg(src, alt = '') {
  if (!src || src.includes('perangkat/') || src.includes('berita/') || src.includes('listing/')) {
    return imgPlaceholder(alt || src);
  }
  return src;
}
