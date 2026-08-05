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

  // Deskripsi & Video Profil
  if (document.getElementById('desaDeskripsi')) {
    document.getElementById('desaDeskripsi').textContent = desa.deskripsi_singkat || '';
  }
  
  if (desa.video_profil && document.getElementById('iframeVideo')) {
    let videoUrl = desa.video_profil;
    let videoId = null;
    
    try {
      if (videoUrl.includes('youtu.be/')) {
        videoId = videoUrl.split('youtu.be/')[1].split('?')[0];
      } else if (videoUrl.includes('youtube.com/watch')) {
        const urlParams = new URLSearchParams(new URL(videoUrl).search);
        videoId = urlParams.get('v');
      } else if (videoUrl.includes('youtube.com/shorts/')) {
        videoId = videoUrl.split('shorts/')[1].split('?')[0];
      } else if (videoUrl.includes('youtube.com/embed/')) {
        videoId = videoUrl.split('embed/')[1].split('?')[0];
      }
    } catch (e) {
      console.error("Error parsing video URL:", e);
    }

    console.log("Original videoUrl:", videoUrl, "Parsed videoId:", videoId);

    if (videoId) {
      document.getElementById('iframeVideo').src = 'https://www.youtube.com/embed/' + videoId;
      document.getElementById('iframeVideo').style.border = '5px solid red'; // DEBUG VISUAL
      document.getElementById('secVideo').style.display = 'block';
    } else if (videoUrl.includes('youtube.com/embed/')) {
      document.getElementById('iframeVideo').src = videoUrl;
      document.getElementById('iframeVideo').style.border = '5px solid blue'; // DEBUG VISUAL
      document.getElementById('secVideo').style.display = 'block';
    } else {
      console.error("Video ID not found for URL:", videoUrl);
    }
  }

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
  if (document.getElementById('miniCalendarContainer')) {
    const miniCont = document.getElementById('miniCalendarContainer');
    const beritaRes = await API.berita();
    const agendaData = (beritaRes.data || []).filter(b => b.kategori === 'Agenda' || b.kategori === 'Kegiatan');
    
    miniCont.innerHTML = '';
    const colors = ['#2e7d32', '#f57f17', '#1565c0', '#ad1457', '#00695c', '#4a148c', '#ef6c00', '#c62828', '#ff8f00', '#0277bd'];
    const events = agendaData.map((a) => {
      const startDate = a.tanggal ? a.tanggal.split('T')[0] : '';
      return {
        title: a.judul,
        start: startDate,
        url: '/berita-detail.html?id=' + a.id,
        backgroundColor: colors[Math.floor(Math.random() * colors.length)],
        borderColor: 'transparent'
      };
    });

    const calendar = new FullCalendar.Calendar(miniCont, {
      initialView: 'listMonth',
      locale: 'id',
      headerToolbar: {
        left: 'prev,next',
        center: 'title',
        right: 'dayGridMonth,listMonth'
      },
      events: events,
      eventClick: function(info) {
        if (info.event.url) {
          window.location.href = info.event.url;
          info.jsEvent.preventDefault();
        }
      },
      height: 'auto'
    });
    calendar.render();
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
