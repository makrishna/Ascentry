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
  if (nav) nav.style.background = window.scrollY > 40
    ? 'rgba(10,22,40,0.98)'
    : 'rgba(10,22,40,0.92)';
});

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
