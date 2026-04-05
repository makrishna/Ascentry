// ── Scroll Reveal ──
const reveals = document.querySelectorAll('.reveal');
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
reveals.forEach(el => revealObs.observe(el));

// ── Hamburger menu ──
const ham = document.querySelector('.hamburger');
const navLinks = document.querySelector('.nav-links');
if (ham) ham.addEventListener('click', () => {
  ham.classList.toggle('open');
  if (navLinks) navLinks.classList.toggle('mobile-open');
});

// ── Sticky nav background on scroll ──
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (!nav) return;
  const isLight = document.documentElement.classList.contains('light');
  if (window.scrollY > 40) {
    nav.style.background = isLight ? 'rgba(240,244,248,0.98)' : 'rgba(10,22,40,0.98)';
  } else {
    nav.style.background = isLight ? 'rgba(240,244,248,0.92)' : 'rgba(10,22,40,0.92)';
  }
});

// ── Theme Toggle ──
(function () {
  const STORAGE_KEY = 'nexacore-theme';
  const html = document.documentElement;

  // Apply saved preference immediately (before paint)
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light') html.classList.add('light');

  function getIcon() {
    return html.classList.contains('light') ? '🌙' : '☀️';
  }
  function getLabel() {
    return html.classList.contains('light') ? 'Switch to Dark Mode' : 'Switch to Light Mode';
  }

  function syncButtons() {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = getIcon();
      btn.setAttribute('aria-label', getLabel());
      btn.setAttribute('title', getLabel());
    });
    // also update nav bg without waiting for scroll
    const nav = document.querySelector('nav');
    if (nav) {
      const isLight = html.classList.contains('light');
      nav.style.background = window.scrollY > 40
        ? (isLight ? 'rgba(240,244,248,0.98)' : 'rgba(10,22,40,0.98)')
        : (isLight ? 'rgba(240,244,248,0.92)' : 'rgba(10,22,40,0.92)');
    }
  }

  function toggleTheme() {
    html.classList.toggle('light');
    localStorage.setItem(STORAGE_KEY, html.classList.contains('light') ? 'light' : 'dark');
    syncButtons();
  }

  // Inject toggle button into nav after DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const btn = document.createElement('button');
    btn.className = 'theme-toggle';
    btn.setAttribute('aria-label', getLabel());
    btn.setAttribute('title', getLabel());
    btn.textContent = getIcon();
    btn.addEventListener('click', toggleTheme);
    nav.appendChild(btn);
    syncButtons();
  });
})();

// ── Form submit ──
function handleSubmit(btn) {
  btn.textContent = 'Message Sent! ✓';
  btn.style.background = '#00a88e';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Send Message →';
    btn.style.background = '';
    btn.disabled = false;
  }, 4000);
}

// ── Counter animation ──
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || '';
  const duration = 1800;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    el.textContent = (Number.isInteger(target) ? Math.round(current) : current.toFixed(1)) + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
const counterObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting && !e.target.dataset.counted) {
      e.target.dataset.counted = '1';
      animateCounter(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('.counter').forEach(el => counterObs.observe(el));