import { h } from '../dom.js';

/** Manifest de mídia (media/manifest.json → items). Definido em main.js via setManifest. */
let MANIFEST = {};
export function setManifest(m) { MANIFEST = m || {}; }
export function manifestEntry(src) { return MANIFEST[src] || null; }

function srcsetFor(entry, format) {
  if (!entry) return '';
  return entry.variants
    .filter((v) => v.format === format)
    .sort((a, b) => a.w - b.w)
    .map((v) => `${v.src} ${v.w}w`)
    .join(', ');
}

/** Melhor URL única para um uso (ex.: poster de <video>): webp mais próxima de `target` px. */
export function bestSrc(src, target = 1280) {
  const e = manifestEntry(src);
  const pool = e ? e.variants.filter((v) => v.format === 'webp') : [];
  if (!pool.length) return null;
  return pool.reduce((best, v) => (Math.abs(v.w - target) < Math.abs(best.w - target) ? v : best)).src;
}

/** Fonte de imagem estática para um item de mídia (imagem ou poster de vídeo). */
export function stillOf(item) {
  if (!item) return null;
  if (item.type === 'video') {
    const e = manifestEntry(item.src);
    const poster = item.poster || (e && e.poster) || null;
    return { src: poster, manifestKey: item.src, alt: item.alt, w: item.w || e?.w, h: item.h || e?.h };
  }
  return { src: item.src, manifestKey: item.src, alt: item.alt, w: item.w, h: item.h };
}

/**
 * <picture> responsivo com AVIF/WebP do manifest, fallback no original.
 * @param {{src,alt,w,h,manifestKey?}} img
 * @param {{sizes?:string, eager?:boolean, className?:string}} opts
 */
export function picture(img, { sizes = '100vw', eager = false, className = '' } = {}) {
  if (!img || !img.src) return mediaPlaceholder(img?.alt);
  const e = manifestEntry(img.manifestKey || img.src);
  const w = img.w || e?.w; const hh = img.h || e?.h;
  const pic = h('picture', { class: `media ${className}`.trim() });
  for (const fmt of ['avif', 'webp']) {
    const ss = srcsetFor(e, fmt);
    if (ss) pic.append(h('source', { type: `image/${fmt}`, srcset: ss, sizes }));
  }
  pic.append(h('img', {
    class: 'media__img',
    src: img.src,
    alt: img.alt || '',
    width: w, height: hh,
    loading: eager ? 'eager' : 'lazy',
    decoding: eager ? 'auto' : 'async',
    fetchpriority: eager ? 'high' : null,
  }));
  if (w && hh) pic.style.setProperty('--ar', `${w} / ${hh}`);
  return pic;
}

/** <video> com poster otimizado. preload=none para não baixar até o play. */
export function video(item, { autoplay = false, controls = true, className = '' } = {}) {
  const still = stillOf(item);
  const poster = bestSrc(item.src, 1280) || still?.src || undefined;
  const v = h('video', {
    class: `media media--video ${className}`.trim(),
    src: item.src,
    poster,
    width: item.w, height: item.h,
    preload: autoplay ? 'metadata' : 'none',
    playsinline: true,
    controls,
    muted: autoplay,
    loop: autoplay,
    autoplay,
    'aria-label': item.alt || 'Vídeo',
  });
  if (autoplay) v.muted = true;
  if (item.w && item.h) v.style.setProperty('--ar', `${item.w} / ${item.h}`);
  return v;
}

/** Placeholder honesto (sem imagem de banco). */
export function mediaPlaceholder(label = 'Mídia indisponível') {
  return h('div', { class: 'media media--placeholder', role: 'img', 'aria-label': label }, h('span', {}, label));
}

/** Retorna 'landscape' | 'portrait' | 'square' | 'panorama' para escolher spans do mosaico. */
export function shapeOf(w, hh) {
  if (!w || !hh) return 'landscape';
  const r = w / hh;
  if (r >= 2.1) return 'panorama';
  if (r >= 1.2) return 'landscape';
  if (r <= 0.8) return 'portrait';
  return 'square';
}
