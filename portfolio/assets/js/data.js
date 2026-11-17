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

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const strs = (v) => arr(v).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
const TYPES = ['realizado', 'pessoal', 'conceitual'];

export function normalizePortfolio(raw) {
  const p = raw || {};
  const site = {
    brand: '', name: 'Chagas', fullName: '', since: '', location: '', email: '', whatsapp: '', whatsappDisplay: '',
    instagram: '', instagramUrl: '', url: '', tagline: '', about: '',
    ...(p.site || {}),
  };
  site.whatsapp = String(site.whatsapp || '').replace(/\D/g, '');
  site.instagram = String(site.instagram || '').replace(/^@/, '').trim();
  const categories = arr(p.categories).filter((c) => c && c.id);
  const projects = arr(p.projects)
    .filter((pr) => pr && pr.id && (pr.status ?? 'published') !== 'draft' && pr.status !== 'hidden')
    .map((pr) => ({
      ...pr,
      media: arr(pr.media).filter((m) => m && m.src).map(typed),
      cover: typed(pr.cover && pr.cover.src ? pr.cover : arr(pr.media)[0]) || null,
    }))
    .sort((a, b) => (Number(b.featured) - Number(a.featured)) || ((b.year || 0) - (a.year || 0)));

  // v3 — sobre (aceita legado site.about como parágrafo único)
  const ab = p.about && typeof p.about === 'object' ? p.about : {};
  const paragraphs = strs(ab.paragraphs);
  const about = { paragraphs: paragraphs.length ? paragraphs : strs([site.about]), photo: ab.photo || null, quote: str(ab.quote) || null };

  const areas = arr(p.areas).filter((a) => a && a.label)
    .map((a, i) => ({ id: a.id || `area-${i + 1}`, label: a.label, intro: str(a.intro), items: strs(a.items) }));
  const tools = arr(p.tools).map((t) => (typeof t === 'string' ? { name: t } : t)).filter((t) => t && t.name)
    .map((t) => ({ name: t.name, uses: strs(t.uses), context: str(t.context) }));
  const eq = p.equipment && typeof p.equipment === 'object' ? p.equipment : {};
  const equipment = {
    note: str(eq.note) || 'Equipamentos já utilizados ou explorados.',
    items: arr(eq.items).map((e) => (typeof e === 'string' ? { name: e } : e)).filter((e) => e && e.name)
      .map((e) => ({ name: e.name, kind: str(e.kind) })),
    knowledge: strs(eq.knowledge),
  };
  const timeline = arr(p.timeline).filter((t) => t && (t.title || t.text))
    .map((t) => ({ period: t.period != null ? String(t.period) : '', title: str(t.title), text: str(t.text) }));
  const selected = arr(p.selected).filter((s) => s && s.id && s.title).map((s) => ({
    ...s,
    type: TYPES.includes(s.type) ? s.type : 'realizado',
    status: str(s.status) || null,
    year: s.year ?? null,
    role: str(s.role), summary: str(s.summary), slogan: str(s.slogan) || null,
    media: arr(s.media).filter((m) => m && m.src).map(typed),
    cover: typed(s.cover && s.cover.src ? s.cover : null) || null,
    links: arr(s.links).filter((l) => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url)),
  }));
  const products = arr(p.products).filter((x) => x && x.id && x.name).map((x) => ({
    ...x,
    kind: str(x.kind), description: str(x.description), application: str(x.application),
    image: x.image || null, availability: str(x.availability) || 'a confirmar',
  }));

  // v5 — habilidades, processo, destaques (ids de projects) e citação
  const process = arr(p.process).filter((x) => x && x.title).map((x) => ({ title: str(x.title), text: str(x.text) }));
  const q = p.quote && typeof p.quote === 'object' ? p.quote : {};
  const quote = str(q.text) ? { text: str(q.text), signature: str(q.signature) } : null;
  return { site, about, areas, tools, equipment, timeline, selected, products, categories, projects, missing: arr(p.missing),
    skills: strs(p.skills), process, highlights: strs(p.highlights), quote };
}

/**
 * v3: {currency, disclaimer, note, groups:[{id,label,items:[{id,label,price_from,unit,desc}]}], products:{id:number|null}, terms}
 * Aceita o formato legado (services → tiers/addons) convertendo para groups.
 */
export function normalizePricing(raw) {
  const p = raw || {};
  let groups = arr(p.groups);
  if (!groups.length && arr(p.services).length) {
    groups = p.services.map((s) => ({
      id: s.id, label: s.label, summary: s.summary,
      items: arr(s.tiers).map((t, i) => ({ id: `${s.id}-${i + 1}`, label: t.name, price_from: t.price_from, unit: t.unit, desc: arr(t.includes).join(' · ') })),
    }));
  }
  groups = groups.filter((g) => g && g.label).map((g, gi) => ({
    id: g.id || `grupo-${gi + 1}`, label: g.label, summary: str(g.summary),
    items: arr(g.items).filter((it) => it && it.label).map((it, i) => ({
      id: it.id || `${g.id || gi}-${i + 1}`, label: it.label,
      price_from: it.price_from ?? null, unit: it.unit ?? null, desc: str(it.desc),
    })),
  }));
  const products = p.products && typeof p.products === 'object' && !Array.isArray(p.products) ? p.products : {};
  return {
    currency: p.currency || 'BRL',
    disclaimer: str(p.disclaimer),
    note: str(p.note),
    groups, products,
    terms: strs(p.terms),
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
