import type { Brand } from './brandDefaults.js';

/**
 * Sistema de templates SVG da identidade visual.
 * Toda arte é gerada a partir das cores, fontes e espaçamentos da marca — consistência garantida.
 */

export const SIZES = {
  feed: { w: 1080, h: 1350 },   // 4:5
  story: { w: 1080, h: 1920 },  // 9:16
  reel: { w: 1080, h: 1920 },
} as const;

export interface TextBlockResult { svg: string; overflow: boolean; lines: string[]; fontSize: number }

export const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** Largura média aproximada de caractere para Inter (em fração do tamanho da fonte). */
const CHAR_W = (weight: number) => (weight >= 700 ? 0.58 : 0.53);

export function wrap(text: string, maxChars: number): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/** Bloco de texto que reduz a fonte até caber na caixa; sinaliza overflow se não couber no mínimo. */
export function textBlock(o: {
  text: string; x: number; y: number; width: number; maxHeight: number;
  fontSize: number; minFontSize: number; weight: number; color: string; family: string;
  lineHeight?: number; anchor?: 'start' | 'middle'; letterSpacing?: number;
}): TextBlockResult {
  const lh = o.lineHeight ?? 1.18;
  let size = o.fontSize;
  let lines: string[] = [];
  let overflow = false;
  for (;;) {
    const maxChars = Math.max(4, Math.floor(o.width / (size * CHAR_W(o.weight))));
    lines = wrap(o.text, maxChars);
    const longestWord = Math.max(0, ...o.text.split(/\s+/).map((w) => w.length));
    const fits = lines.length * size * lh <= o.maxHeight && longestWord <= maxChars;
    if (fits) break;
    if (size <= o.minFontSize) {
      overflow = true;
      break;
    }
    size = Math.max(o.minFontSize, Math.round(size * 0.92));
  }
  const tx = o.anchor === 'middle' ? o.x + o.width / 2 : o.x;
  const tspans = lines
    .map((l, i) => `<tspan x="${tx}" dy="${i === 0 ? 0 : size * lh}">${esc(l)}</tspan>`)
    .join('');
  const svg = `<text x="${tx}" y="${o.y + size}" font-family="${esc(o.family)}, Inter, DejaVu Sans, sans-serif" font-size="${size}" font-weight="${o.weight}" fill="${o.color}" text-anchor="${o.anchor ?? 'start'}" letter-spacing="${o.letterSpacing ?? -0.5}">${tspans}</text>`;
  return { svg, overflow, lines, fontSize: size };
}

function frame(w: number, h: number, brand: Brand, inner: string, bgImage?: string) {
  const c = brand.colors;
  const bg = bgImage
    ? `<image href="${bgImage}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice"/>
       <rect width="${w}" height="${h}" fill="url(#shade)"/>`
    : `<rect width="${w}" height="${h}" fill="url(#bg)"/>
       <circle cx="${w * 0.88}" cy="${h * 0.08}" r="${w * 0.42}" fill="${c.primary}" opacity="0.16"/>
       <circle cx="${w * 0.05}" cy="${h * 0.95}" r="${w * 0.3}" fill="${c.accent}" opacity="0.07"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="${c.surface}"/><stop offset="1" stop-color="${c.background}"/></linearGradient>
  <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.background}" stop-opacity="0.35"/><stop offset="0.55" stop-color="${c.background}" stop-opacity="0.75"/><stop offset="1" stop-color="${c.background}" stop-opacity="0.95"/></linearGradient>
</defs>
${bg}
${inner}
</svg>`;
}

function footer(w: number, h: number, brand: Brand, extra = '') {
  const m = brand.layout.margin;
  const handle = brand.layout.showHandle && brand.handle ? `@${brand.handle.replace(/^@/, '')}` : brand.brand_name;
  return `<rect x="${m}" y="${h - m - 6}" width="44" height="6" rx="3" fill="${brand.colors.primary}"/>
<text x="${m + 60}" y="${h - m + 2}" font-family="${esc(brand.fonts.body)}, Inter, sans-serif" font-size="30" font-weight="600" fill="${brand.colors.muted}">${esc(handle)}</text>
${extra}`;
}

function pill(x: number, y: number, label: string, brand: Brand) {
  const w = Math.round(label.length * 17 + 48);
  return `<rect x="${x}" y="${y}" width="${w}" height="56" rx="28" fill="${brand.colors.primary}" opacity="0.18"/>
<rect x="${x}" y="${y}" width="${w}" height="56" rx="28" fill="none" stroke="${brand.colors.primary}" stroke-opacity="0.6" stroke-width="2"/>
<text x="${x + 24}" y="${y + 37}" font-family="Inter, sans-serif" font-size="26" font-weight="700" letter-spacing="2" fill="${brand.colors.accent}">${esc(label.toUpperCase())}</text>`;
}

export interface Rendered { svg: string; overflow: boolean; w: number; h: number }

export function feedImageSvg(brand: Brand, d: { kicker: string; headline: string; sub?: string }, bgImage?: string): Rendered {
  const { w, h } = SIZES.feed;
  const m = brand.layout.margin;
  const head = textBlock({ text: d.headline, x: m, y: 430, width: w - m * 2, maxHeight: 520, fontSize: 104, minFontSize: 60, weight: brand.fonts.headingWeight, color: brand.colors.text, family: brand.fonts.heading, lineHeight: 1.05 });
  const sub = d.sub
    ? textBlock({ text: d.sub, x: m, y: 430 + head.lines.length * head.fontSize * 1.05 + 50, width: w - m * 2, maxHeight: 260, fontSize: 40, minFontSize: 30, weight: brand.fonts.bodyWeight, color: brand.colors.muted, family: brand.fonts.body, lineHeight: 1.35 })
    : null;
  const inner = `${pill(m, m, d.kicker, brand)}${head.svg}${sub?.svg ?? ''}${footer(w, h, brand)}`;
  return { svg: frame(w, h, brand, inner, bgImage), overflow: head.overflow || !!sub?.overflow, w, h };
}

export function carouselSlideSvg(brand: Brand, d: { index: number; total: number; title: string; body?: string; kind: 'cover' | 'content' | 'cta'; kicker?: string }): Rendered {
  const { w, h } = SIZES.feed;
  const m = brand.layout.margin;
  const counter = brand.layout.showSlideCounter
    ? `<text x="${w - m}" y="${h - m + 2}" text-anchor="end" font-family="Inter, sans-serif" font-size="28" font-weight="700" fill="${brand.colors.muted}">${d.index + 1}/${d.total}</text>`
    : '';
  let inner = '';
  let overflow = false;
  if (d.kind === 'cover') {
    const t = textBlock({ text: d.title, x: m, y: 380, width: w - m * 2, maxHeight: 600, fontSize: 112, minFontSize: 64, weight: brand.fonts.headingWeight, color: brand.colors.text, family: brand.fonts.heading, lineHeight: 1.04 });
    overflow = t.overflow;
    inner = `${pill(m, m, d.kicker ?? 'Guia', brand)}${t.svg}
<text x="${m}" y="${h - m - 110}" font-family="Inter, sans-serif" font-size="34" font-weight="700" fill="${brand.colors.accent}">Arraste para o lado →</text>`;
  } else {
    const num = `<text x="${m}" y="${m + 120}" font-family="Inter, sans-serif" font-size="140" font-weight="900" fill="${brand.colors.primary}" opacity="0.9">${String(d.index).padStart(2, '0')}</text>`;
    const t = textBlock({ text: d.title, x: m, y: 330, width: w - m * 2, maxHeight: 330, fontSize: 76, minFontSize: 50, weight: brand.fonts.headingWeight, color: brand.colors.text, family: brand.fonts.heading, lineHeight: 1.08 });
    const by = 330 + t.lines.length * t.fontSize * 1.08 + 60;
    const b = d.body
      ? textBlock({ text: d.body, x: m, y: by, width: w - m * 2, maxHeight: h - by - m - 120, fontSize: 42, minFontSize: 30, weight: brand.fonts.bodyWeight, color: brand.colors.muted, family: brand.fonts.body, lineHeight: 1.38 })
      : null;
    overflow = t.overflow || !!b?.overflow;
    inner = `${d.kind === 'cta' ? pill(m, m, 'Salve este post', brand) : num}${t.svg}${b?.svg ?? ''}`;
  }
  return { svg: frame(w, h, brand, inner + footer(w, h, brand, counter)), overflow, w, h };
}

/** Capa do Reel: título dentro da área segura central (o grid recorta em 4:5 / 1:1). */
export function reelCoverSvg(brand: Brand, d: { title: string; kicker: string }, bgImage?: string): Rendered {
  const { w, h } = SIZES.reel;
  const m = brand.layout.margin;
  const safeTop = (h - 1350) / 2 + 120;
  const t = textBlock({ text: d.title, x: m, y: safeTop + 120, width: w - m * 2, maxHeight: 640, fontSize: 116, minFontSize: 66, weight: brand.fonts.headingWeight, color: brand.colors.text, family: brand.fonts.heading, lineHeight: 1.04 });
  const inner = `${pill(m, safeTop, d.kicker, brand)}${t.svg}${footer(w, h - 220, brand)}`;
  return { svg: frame(w, h, brand, inner, bgImage), overflow: t.overflow, w, h };
}

/** Quadro de cena do Reel (texto na tela). Mantém margens livres da UI do Instagram (topo 250px, base 420px). */
export function reelSceneSvg(brand: Brand, d: { text: string; index: number; total: number; emphasis?: string }, bgImage?: string): Rendered {
  const { w, h } = SIZES.reel;
  const m = brand.layout.margin;
  const top = 520;
  const t = textBlock({ text: d.text, x: m, y: top, width: w - m * 2, maxHeight: 720, fontSize: 92, minFontSize: 56, weight: brand.fonts.headingWeight, color: brand.colors.text, family: brand.fonts.heading, lineHeight: 1.1 });
  const em = d.emphasis
    ? textBlock({ text: d.emphasis, x: m, y: top + t.lines.length * t.fontSize * 1.1 + 50, width: w - m * 2, maxHeight: 240, fontSize: 48, minFontSize: 34, weight: 600, color: brand.colors.accent, family: brand.fonts.body, lineHeight: 1.3 })
    : null;
  const progressW = ((w - m * 2) * (d.index + 1)) / d.total;
  const inner = `<rect x="${m}" y="300" width="${w - m * 2}" height="8" rx="4" fill="${brand.colors.text}" opacity="0.15"/>
<rect x="${m}" y="300" width="${progressW}" height="8" rx="4" fill="${brand.colors.primary}"/>
${t.svg}${em?.svg ?? ''}`;
  return { svg: frame(w, h, brand, inner, bgImage), overflow: t.overflow || !!em?.overflow, w, h };
}

export function storySvg(brand: Brand, d: { text: string; kicker?: string; prompt?: string }, bgImage?: string): Rendered {
  const { w, h } = SIZES.story;
  const m = brand.layout.margin;
  const t = textBlock({ text: d.text, x: m, y: 640, width: w - m * 2, maxHeight: 640, fontSize: 84, minFontSize: 52, weight: brand.fonts.headingWeight, color: brand.colors.text, family: brand.fonts.heading, lineHeight: 1.1 });
  const promptBox = d.prompt
    ? (() => {
        const opts = { text: d.prompt!, x: m + 40, width: w - m * 2 - 80, maxHeight: 150, fontSize: 42, minFontSize: 30, weight: 700, color: brand.colors.background, family: brand.fonts.body, anchor: 'middle' as const, lineHeight: 1.2 };
        const probe = textBlock({ ...opts, y: 0 });
        const blockH = probe.lines.length * probe.fontSize * 1.2;
        const top = 1330 + (200 - blockH) / 2 - probe.fontSize * 0.12;
        const pt = textBlock({ ...opts, y: top });
        return { svg: `<rect x="${m}" y="1330" width="${w - m * 2}" height="200" rx="${brand.layout.radius}" fill="${brand.colors.text}"/>${pt.svg}`, overflow: pt.overflow };
      })()
    : { svg: '', overflow: false };
  const inner = `${d.kicker ? pill(m, 300, d.kicker, brand) : ''}${t.svg}${promptBox.svg}${footer(w, h - 200, brand)}`;
  return { svg: frame(w, h, brand, inner, bgImage), overflow: t.overflow || promptBox.overflow, w, h };
}
