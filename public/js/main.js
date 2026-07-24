// ===== MAIN.JS - Common UI Logic =====

// ----- Navbar -----
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const burger = document.querySelector('.nav-burger');
  const mobileMenu = document.querySelector('.nav-mobile');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) navbar?.classList.add('scrolled');
    else navbar?.classList.remove('scrolled');
  });

  burger?.addEventListener('click', () => {
    burger.classList.toggle('open');
    mobileMenu?.classList.toggle('open');
  });

  // Close mobile menu on link click
  mobileMenu?.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger?.classList.remove('open');
      mobileMenu?.classList.remove('open');
    });
  });

  // Set active link
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link, .nav-mobile .nav-link').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// ----- Back to top -----
function initBackToTop() {
  const btn = document.querySelector('.back-to-top');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) btn.classList.add('visible');
    else btn.classList.remove('visible');
  });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

// ----- Fade-in on scroll -----
function initScrollAnimations() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => obs.observe(el));
}

// ----- Counter animation -----
function animateCounter(el, target, duration = 1500) {
  const start = 0;
  const step = (timestamp) => {
    if (!startTime) startTime = timestamp;
    const progress = Math.min((timestamp - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * (target - start) + start).toLocaleString('id-ID');
    if (progress < 1) requestAnimationFrame(step);
  };
  let startTime = null;
  requestAnimationFrame(step);
}

// ----- Hero Slider -----
function initHeroSlider() {
  const slides = document.querySelectorAll('.hero-slide');
  const dots = document.querySelectorAll('.hero-dot');
  const slidesContainer = document.querySelector('.hero-slides');
  if (!slides.length) return;

  let current = 0;
  let autoTimer;

  function goTo(idx) {
    slides[current].classList.remove('active');
    dots[current]?.classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current]?.classList.add('active');
    if (slidesContainer) slidesContainer.style.transform = `translateX(-${current * 100}%)`;
  }

  function startAuto() {
    stopAuto();
    autoTimer = setInterval(() => goTo(current + 1), 5500);
  }
  function stopAuto() { clearInterval(autoTimer); }

  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); startAuto(); }));
  document.querySelector('.hero-prev')?.addEventListener('click', () => { goTo(current - 1); startAuto(); });
  document.querySelector('.hero-next')?.addEventListener('click', () => { goTo(current + 1); startAuto(); });

  // Touch/swipe
  let touchStartX = 0;
  document.querySelector('.hero-section')?.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; });
  document.querySelector('.hero-section')?.addEventListener('touchend', e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { goTo(diff > 0 ? current + 1 : current - 1); startAuto(); }
  });

  slides[0]?.classList.add('active');
  dots[0]?.classList.add('active');
  startAuto();
}

// ----- Load Desa Info into navbars/footers -----
async function loadDesaInfo() {
  const desa = await API.desa();
  if (!desa) return;

  // Update page title
  document.querySelectorAll('[data-desa-nama]').forEach(el => el.textContent = 'Desa ' + desa.nama_desa);
  document.querySelectorAll('[data-desa-kecamatan]').forEach(el => el.textContent = 'Kecamatan ' + desa.kecamatan);
  document.querySelectorAll('[data-desa-kabupaten]').forEach(el => el.textContent = 'Kabupaten ' + desa.kabupaten);
  document.querySelectorAll('[data-desa-tagline]').forEach(el => el.textContent = desa.tagline);
  document.querySelectorAll('[data-desa-email]').forEach(el => { el.textContent = desa.kontak?.email; el.href = 'mailto:' + desa.kontak?.email; });
  document.querySelectorAll('[data-desa-telp]').forEach(el => el.textContent = desa.kontak?.telepon);
  document.querySelectorAll('[data-desa-alamat]').forEach(el => el.textContent = desa.kontak?.alamat);
  document.querySelectorAll('[data-desa-jam]').forEach(el => el.textContent = desa.kontak?.jam_operasional);
  document.querySelectorAll('[data-desa-wa]').forEach(el => {
    el.href = `https://wa.me/${desa.kontak?.whatsapp}`;
  });
  if (desa.sosmed?.facebook) document.querySelectorAll('[data-sosmed-fb]').forEach(el => el.href = desa.sosmed.facebook);
  if (desa.sosmed?.instagram) document.querySelectorAll('[data-sosmed-ig]').forEach(el => el.href = desa.sosmed.instagram);
  if (desa.sosmed?.youtube) document.querySelectorAll('[data-sosmed-yt]').forEach(el => el.href = desa.sosmed.youtube);

  // Sambutan Kades
  if (desa.sambutan_kades && document.getElementById('secSambutan')) {
    document.getElementById('secSambutan').style.display = 'block';
    document.getElementById('txtSambutan').textContent = '"' + desa.sambutan_kades + '"';
    document.getElementById('txtNamaKades').textContent = desa.kepala_desa || 'Kepala Desa';
    if(desa.foto_kades) {
      document.getElementById('imgKades').src = desa.foto_kades;
      document.getElementById('imgKades').style.display = 'block';
    }
  }

  // Agenda Terdekat (Index)
  if (document.getElementById('agendaIndex')) {
    const agendaData = await API.agenda();
    if(agendaData && agendaData.length > 0) {
      document.getElementById('agendaIndex').innerHTML = agendaData.slice(0,3).map(a => 
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
      ).join('');
    } else {
      document.getElementById('agendaIndex').innerHTML = '<p>Belum ada kegiatan terdekat.</p>';
    }
  }
}

// ----- Lightbox for gallery -----
function initLightbox() {
  const items = document.querySelectorAll('.galeri-item');
  if (!items.length) return;
  items.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;
      const overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:20px;';
      const image = document.createElement('img');
      image.src = img.src;
      image.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:12px;';
      overlay.appendChild(image);
      overlay.addEventListener('click', () => overlay.remove());
      document.body.appendChild(overlay);
    });
  });
}

// ----- Notification / Toast -----
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:32px;left:50%;transform:translateX(-50%) translateY(100px);
    background:${type === 'success' ? '#2e7d32' : '#c62828'};color:#fff;
    padding:14px 28px;border-radius:100px;font-size:0.9rem;font-weight:600;
    z-index:9999;transition:transform 0.3s ease;box-shadow:0 8px 24px rgba(0,0,0,0.2);
    font-family:'Outfit',sans-serif;display:flex;align-items:center;gap:8px;
  `;
  toast.innerHTML = `${type === 'success' ? '✓' : '✕'} ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.style.transform = 'translateX(-50%) translateY(0)', 10);
  setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(100px)'; setTimeout(() => toast.remove(), 300); }, 3000);
}

// ----- Init all -----
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initBackToTop();
  initScrollAnimations();
  initHeroSlider();
  initLightbox();
  loadDesaInfo();
});
