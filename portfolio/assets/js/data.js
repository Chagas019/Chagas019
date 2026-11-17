import { CONFIG } from './config.js';

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${url}`);
  return res.json();
}

/** Tenta o arquivo real; se ausente/inválido, usa a fixture e avisa no console. */
async function loadWithFallback(real, fixture, label) {
  try {
    return { data: await fetchJSON(real), source: real, fixture: false };
  } catch (err) {
    console.warn(`[data] ${label}: usando fixture (${fixture}) — ${err.message}`);
    try {
      return { data: await fetchJSON(fixture), source: fixture, fixture: true };
    } catch (err2) {
      console.warn(`[data] ${label}: fixture indisponível — ${err2.message}`);
      return { data: null, source: null, fixture: true };
    }
  }
}

async function loadManifest() {
  try { return (await fetchJSON(CONFIG.content.manifest)).items || {}; }
  catch (err) { console.warn(`[data] manifest de mídia ausente — srcset desativado (${err.message})`); return {}; }
}

const arr = (v) => (Array.isArray(v) ? v : []);
const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?|$)/i;
/** Garante `type` em itens de mídia (capa .mp4 sem type → video). */
const typed = (m) => (m && m.src ? { ...m, type: m.type || (VIDEO_RE.test(m.src) ? 'video' : 'image') } : m);

export function normalizePortfolio(raw) {
  const p = raw || {};
  const site = { name: 'Chagas', tagline: '', about: '', location: '', email: '', whatsapp: '', instagram: '', ...(p.site || {}) };
  const categories = arr(p.categories).filter((c) => c && c.id);
  const projects = arr(p.projects)
    .filter((pr) => pr && pr.id && (pr.status ?? 'published') !== 'draft' && pr.status !== 'hidden')
    .map((pr) => ({
      ...pr,
      media: arr(pr.media).filter((m) => m && m.src).map(typed),
      cover: typed(pr.cover && pr.cover.src ? pr.cover : arr(pr.media)[0]) || null,
    }))
    .sort((a, b) => (Number(b.featured) - Number(a.featured)) || ((b.year || 0) - (a.year || 0)));
  return { site, categories, projects, missing: arr(p.missing) };
}

export function normalizePricing(raw) {
  const p = raw || {};
  return {
    disclaimer: p.disclaimer || '',
    currency: p.currency || 'BRL',
    services: arr(p.services).map((s) => ({ ...s, tiers: arr(s.tiers), addons: arr(s.addons) })),
    terms: arr(p.terms),
  };
}

export async function loadAll() {
  const c = CONFIG.content;
  const [portfolio, pricing, manifest] = await Promise.all([
    loadWithFallback(c.portfolio, c.portfolioFixture, 'portfolio'),
    loadWithFallback(c.pricing, c.pricingFixture, 'pricing'),
    loadManifest(),
  ]);
  return {
    portfolio: normalizePortfolio(portfolio.data),
    pricing: normalizePricing(pricing.data),
    manifest,
    meta: { portfolioSource: portfolio.source, pricingSource: pricing.source, usingFixtures: portfolio.fixture || pricing.fixture },
  };
}
