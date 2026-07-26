#!/usr/bin/env node
/**
 * generate-services.js
 * ---------------------------------------------------------------
 * Single source of truth for CONTENT + STRUCTURE:
 *
 *   services-data.json      -> every category & service (data)
 *   partials/header.html    -> the nav, ONE file, ONE place to edit
 *   partials/footer.html    -> the footer, ONE file, ONE place to edit
 *   partials/cta-banner.html-> the closing CTA block, ONE file
 *
 * Change the header/footer/menu?  Edit the partial. Change a service?
 * Edit services-data.json. Then run this script once — it re-stamps
 * the result onto all 36 pages. That's the single point of change.
 *
 * Run:  node scripts/generate-services.js
 * Safe to re-run anytime — fully idempotent.
 * ---------------------------------------------------------------
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT_DIR, 'services-data.json');
const PARTIALS_DIR = path.join(ROOT_DIR, 'partials');
const SERVICES_DIR = path.join(ROOT_DIR, 'services');

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const TOTAL_SERVICES = data.categories.reduce((n, c) => n + c.services.length, 0);

// Each top-level page keeps its own CTA wording, but the markup/styling
// comes from one file: partials/cta-banner.html. Edit wording here,
// edit look-and-feel there.
const TOP_LEVEL_CTA = {
  'index.html': {
    heading: 'Ready to Transform Your IT Infrastructure?',
    text: 'Let our experts design a solution tailored to your business needs.',
    button: 'Get a Free Consultation →',
  },
  'about.html': {
    heading: "Let's Build Something Great Together",
    text: 'Reach out to discover how Ascentry can accelerate your IT strategy.',
    button: 'Contact Our Team →',
  },
  'solutions.html': {
    heading: 'Not Sure Which Solution Fits Your Needs?',
    text: 'Our consultants will assess your environment and recommend the right approach — at no cost.',
    button: 'Book a Free Assessment →',
  },
  'services.html': {
    heading: 'Ready to Offload Your IT Operations?',
    text: 'Let Ascentry manage your infrastructure so you can focus on your business.',
    button: 'Start a Conversation →',
  },
  'clients.html': {
    heading: 'Join 200+ Organisations That Trust Ascentry',
    text: 'Let us demonstrate how we can accelerate your IT strategy and protect your business.',
    button: 'Get in Touch →',
  },
  // contact.html intentionally has no CTA banner (it IS the CTA page)
};

// Pages that already exist and need their <nav>/<footer> blocks synced.
// key = filename, value = which top-level menu item is "active"
const TOP_LEVEL_PAGES = {
  'index.html': null,
  'about.html': 'about',
  'solutions.html': 'solutions',
  'services.html': 'services',
  'clients.html': 'clients',
  'contact.html': null,
};

// ---------------------------------------------------------------
// Tiny template engine — just {{TOKEN}} substitution, no dependencies
// ---------------------------------------------------------------
function loadPartial(name) {
  const raw = fs.readFileSync(path.join(PARTIALS_DIR, name), 'utf8');
  // Strip a leading <!-- ... --> doc comment (meant for humans editing
  // the partial, not for shipping into the rendered page).
  return raw.replace(/^\s*<!--[\s\S]*?-->\s*/, '');
}

function render(template, vars) {
  return template.replace(/{{\s*([A-Z_]+)\s*}}/g, (match, key) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match;
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const HEADER_TEMPLATE = loadPartial('header.html');
const FOOTER_TEMPLATE = loadPartial('footer.html');
const CTA_TEMPLATE = loadPartial('cta-banner.html');

// ---------------------------------------------------------------
// Data-driven fragments (built from services-data.json, not hand-edited)
// ---------------------------------------------------------------
function buildMegaColumns(root) {
  return data.categories.map(cat => {
    const items = cat.services.map(svc => `
              <li><a href="${root}services/${cat.slug}/${svc.slug}.html">${escapeHtml(svc.name)}</a></li>`).join('');
    return `            <div class="mega-col">
              <a href="${root}services/${cat.slug}/index.html" class="mega-col-title">
                <span class="mega-col-icon">${cat.icon}</span> ${escapeHtml(cat.name)}
              </a>
              <p class="mega-col-tagline">${escapeHtml(cat.tagline)}</p>
              <ul>${items}
              </ul>
            </div>`;
  }).join('\n');
}

function buildFooterServicesColumn(root) {
  return data.categories.map(cat =>
    `        <li><a href="${root}services/${cat.slug}/index.html">${escapeHtml(cat.name)}</a></li>`
  ).join('\n');
}

// ---------------------------------------------------------------
// Header / Footer / CTA renderers — every page calls these three
// functions, so there is exactly one place (the partial file) that
// defines what they look like.
// ---------------------------------------------------------------
function renderHeader(root, active) {
  const cls = (key) => (active === key ? ' class="active"' : '');
  return render(HEADER_TEMPLATE, {
    ROOT: root,
    ABOUT_CLASS: cls('about'),
    SOLUTIONS_CLASS: cls('solutions'),
    SERVICES_CLASS: active === 'services' ? ' active' : '',
    CLIENTS_CLASS: cls('clients'),
    MEGA_COLUMNS: buildMegaColumns(root),
    TOTAL_SERVICES: String(TOTAL_SERVICES),
  }).trim();
}

function renderFooter(root) {
  return render(FOOTER_TEMPLATE, {
    ROOT: root,
    FOOTER_SERVICES_COLUMN: buildFooterServicesColumn(root),
    YEAR: String(new Date().getFullYear()),
  }).trim();
}

function renderCta(root, heading, text, button = 'Start a Conversation →') {
  return render(CTA_TEMPLATE, {
    ROOT: root,
    CTA_HEADING: escapeHtml(heading),
    CTA_TEXT: escapeHtml(text),
    CTA_BUTTON: escapeHtml(button),
  }).trim();
}

/** Replaces the first <nav>, <footer>, and (if present) <section class="cta-banner"> blocks. */
function injectPartials(html, navMarkup, footerMarkup, ctaMarkup) {
  const navRegex = /<nav>[\s\S]*?<\/nav>/;
  const footerRegex = /<footer>[\s\S]*?<\/footer>/;
  const ctaRegex = /<section class="cta-banner">[\s\S]*?<\/section>/;
  if (!navRegex.test(html)) throw new Error('Could not find a <nav>...</nav> block.');
  if (!footerRegex.test(html)) throw new Error('Could not find a <footer>...</footer> block.');
  let out = html.replace(navRegex, navMarkup).replace(footerRegex, footerMarkup);
  if (ctaMarkup && ctaRegex.test(out)) {
    out = out.replace(ctaRegex, ctaMarkup);
  }
  return out;
}

// ---------------------------------------------------------------
// 1. Patch nav + footer (+ CTA banner, where present) on every
//    existing top-level page
// ---------------------------------------------------------------
function updateTopLevelPages() {
  Object.entries(TOP_LEVEL_PAGES).forEach(([file, active]) => {
    const filePath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`  ! skipped ${file} (not found)`);
      return;
    }
    const original = fs.readFileSync(filePath, 'utf8');
    const nav = renderHeader('', active);
    const footer = renderFooter('');
    const ctaConfig = TOP_LEVEL_CTA[file];
    const cta = ctaConfig ? renderCta('', ctaConfig.heading, ctaConfig.text, ctaConfig.button) : null;
    const updated = injectPartials(original, nav, footer, cta);
    fs.writeFileSync(filePath, updated);
    console.log(`  ✓ header/footer${cta ? '/cta' : ''} synced: ${file}`);
  });
}

// ---------------------------------------------------------------
// 2 & 3. Generate category + service pages
// ---------------------------------------------------------------
const PAGE_ROOT = '../../'; // services/<cat>/<file>.html -> 2 levels deep

function pageShell({ title, metaDescription, root, active, bodyHtml }) {
  const nav = renderHeader(root, active);
  const footer = renderFooter(root);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(metaDescription)}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="${root}style.css"/>
</head>
<body>

${nav}

${bodyHtml}

${footer}
<script src="${root}main.js"></script>
</body>
</html>
`;
}

function serviceCardHtml(root, cat, svc) {
  return `
        <a class="svc-card" href="${root}services/${cat.slug}/${svc.slug}.html">
          <h3>${escapeHtml(svc.name)}</h3>
          <p>${escapeHtml(svc.summary)}</p>
          <span class="svc-card-link">Learn more →</span>
        </a>`;
}

function buildCategoryPage(cat) {
  const root = PAGE_ROOT;
  const cards = cat.services.map(svc => serviceCardHtml(root, cat, svc)).join('');
  const cta = renderCta(root, `Ready to Talk ${cat.name}?`, `Tell us what you're trying to solve — we'll recommend the right mix of services.`);

  const body = `<div class="page-hero">
  <div class="page-hero-grid"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="page-hero-content">
    <div class="breadcrumb"><a href="${root}index.html">Home</a><span>›</span><a href="${root}services.html">Services</a><span>›</span><span>${escapeHtml(cat.name)}</span></div>
    <div class="page-hero-eyebrow">${cat.icon} ${escapeHtml(cat.tagline)}</div>
    <h1>${escapeHtml(cat.name)}</h1>
    <p>${escapeHtml(cat.summary)}</p>
    <div class="page-hero-actions">
      <a href="${root}contact.html" class="btn-primary">Talk to an Expert →</a>
      <a href="${root}services.html" class="btn-outline">All Services</a>
    </div>
  </div>
</div>

<section class="services-main">
  <div class="section-label reveal">${escapeHtml(cat.name)}</div>
  <h2 class="section-title reveal">Explore Our <em>${escapeHtml(cat.name)}</em></h2>
  <div class="svc-grid reveal">${cards}
  </div>
</section>

${cta}`;

  return pageShell({
    title: `${cat.name} – Ascentry IT Solutions`,
    metaDescription: cat.summary,
    root,
    active: 'services',
    bodyHtml: body,
  });
}

function buildServicePage(cat, svc) {
  const root = PAGE_ROOT;
  const otherServices = cat.services.filter(s => s.slug !== svc.slug).slice(0, 3);
  const related = otherServices.map(s => serviceCardHtml(root, cat, s)).join('');
  const features = svc.features.map(f => `
          <li><span class="svc-feat-check">✓</span>${escapeHtml(f)}</li>`).join('');
  const cta = renderCta(root, `Ready to Get Started with ${svc.name}?`, `Let's scope out exactly what your business needs.`);

  const body = `<div class="page-hero">
  <div class="page-hero-grid"></div>
  <div class="orb orb-1"></div>
  <div class="orb orb-2"></div>
  <div class="page-hero-content">
    <div class="breadcrumb"><a href="${root}index.html">Home</a><span>›</span><a href="${root}services.html">Services</a><span>›</span><a href="${root}services/${cat.slug}/index.html">${escapeHtml(cat.name)}</a><span>›</span><span>${escapeHtml(svc.name)}</span></div>
    <div class="page-hero-eyebrow">${cat.icon} ${escapeHtml(cat.name)}</div>
    <h1>${escapeHtml(svc.name)}</h1>
    <p>${escapeHtml(svc.description)}</p>
    <div class="page-hero-actions">
      <a href="${root}contact.html" class="btn-primary">Talk to an Expert →</a>
      <a href="${root}services/${cat.slug}/index.html" class="btn-outline">${escapeHtml(cat.name)}</a>
    </div>
  </div>
</div>

<section class="services-main">
  <div class="svc-detail-grid reveal">
    <div class="svc-detail-main">
      <div class="section-label">What's Included</div>
      <h2 class="section-title">${escapeHtml(svc.name)}</h2>
      <p class="svc-detail-lead">${escapeHtml(svc.description)}</p>
      <ul class="svc-feat-list">${features}
      </ul>
    </div>
    <aside class="svc-detail-side">
      <div class="svc-side-card">
        <h4>Why Ascentry</h4>
        <p>Part of our ${escapeHtml(cat.name)} practice — backed by a 24/7 team and clear SLAs.</p>
        <a href="${root}contact.html" class="btn-primary" style="width:100%;justify-content:center;margin-top:1rem;">Get a Free Consultation →</a>
      </div>
    </aside>
  </div>

  ${related ? `<div class="section-label reveal" style="margin-top:5rem;">Related Services</div>
  <h2 class="section-title reveal">More in <em>${escapeHtml(cat.name)}</em></h2>
  <div class="svc-grid reveal">${related}
  </div>` : ''}
</section>

${cta}`;

  return pageShell({
    title: `${svc.name} – Ascentry IT Solutions`,
    metaDescription: svc.summary,
    root,
    active: 'services',
    bodyHtml: body,
  });
}

function generateServicePages() {
  let count = 0;
  data.categories.forEach(cat => {
    const catDir = path.join(SERVICES_DIR, cat.slug);
    fs.mkdirSync(catDir, { recursive: true });

    fs.writeFileSync(path.join(catDir, 'index.html'), buildCategoryPage(cat));
    console.log(`  ✓ category page: services/${cat.slug}/index.html`);

    cat.services.forEach(svc => {
      fs.writeFileSync(path.join(catDir, `${svc.slug}.html`), buildServicePage(cat, svc));
      console.log(`    ✓ service page: services/${cat.slug}/${svc.slug}.html`);
      count++;
    });
  });
  return count;
}

// ---------------------------------------------------------------
// Run
// ---------------------------------------------------------------
console.log('Syncing header + footer partials onto top-level pages...');
updateTopLevelPages();

console.log('\nGenerating category + service pages from services-data.json...');
const total = generateServicePages();

console.log(`\nDone. ${data.categories.length} categories, ${total} service pages generated.`);
console.log('Header:  partials/header.html');
console.log('Footer:  partials/footer.html');
console.log('CTA:     partials/cta-banner.html');
console.log('Data:    services-data.json');
