import { useEffect } from 'react';
import type { SeoData } from '@/lib/seo';
import { SITE_URL } from '@/lib/supabase';

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) { el?.remove(); return; }
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}

/** Título, descrição, canonical, Open Graph e JSON-LD por página */
export function useSeo(seo: SeoData | null) {
  useEffect(() => {
    if (!seo) return;
    const origin = SITE_URL || location.origin;
    const url = origin + seo.path;
    const image = seo.image ? (seo.image.startsWith('http') || seo.image.startsWith('data:') ? seo.image : origin + seo.image) : origin + '/og-nexora.jpg';
    document.title = seo.title;
    setMeta('name', 'description', seo.description);
    setMeta('name', 'robots', seo.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    setMeta('property', 'og:title', seo.title);
    setMeta('property', 'og:description', seo.description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', seo.type === 'product' ? 'website' : seo.type ?? 'website');
    setMeta('property', 'og:image', image.startsWith('data:') ? undefined : image);
    setMeta('name', 'twitter:card', 'summary_large_image');
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement('link'); link.rel = 'canonical'; document.head.appendChild(link); }
    link.href = url;
    document.head.querySelectorAll('script[data-seo-jsonld]').forEach((s) => s.remove());
    if (seo.jsonLd) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.dataset.seoJsonld = '';
      s.textContent = JSON.stringify(seo.jsonLd).replace(/</g, '\\u003c');
      document.head.appendChild(s);
    }
  }, [seo?.title, seo?.description, seo?.path, seo?.image, seo?.noindex]); // eslint-disable-line react-hooks/exhaustive-deps
}
