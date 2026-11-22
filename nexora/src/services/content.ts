/** Conteúdo do site (textos, categorias, contato, SEO, depoimentos). Leitura pública, escrita só da equipe. */
import { defaultContent, type SiteContent, type Testimonial } from '@/data/content';
import { supabase } from '@/lib/supabase';
import { readJSON, writeJSON } from '@/lib/storage';
import { invalidate } from './query';

const KEY = 'nexora:demo:content';

export async function getContent(): Promise<SiteContent> {
  if (!supabase) {
    const saved = readJSON<Partial<SiteContent>>(KEY, {});
    return merge(saved);
  }
  const [{ data }, { data: t }] = await Promise.all([
    supabase.from('site_content').select('key, value'),
    supabase.from('testimonials').select('id, author, text, authorized, published').order('created_at', { ascending: false }),
  ]);
  const saved: Partial<SiteContent> = {};
  for (const row of data ?? []) (saved as Record<string, unknown>)[row.key] = row.value;
  saved.testimonials = (t ?? []) as Testimonial[];
  return merge(saved);
}

function merge(saved: Partial<SiteContent>): SiteContent {
  return {
    home: { ...defaultContent.home, ...saved.home },
    categories: saved.categories?.length ? saved.categories : defaultContent.categories,
    contact: { ...defaultContent.contact, ...saved.contact },
    seo: { ...defaultContent.seo, ...saved.seo },
    testimonials: saved.testimonials ?? [],
  };
}

export async function saveContent<K extends keyof SiteContent>(key: K, value: SiteContent[K]): Promise<void> {
  if (!supabase) {
    const saved = readJSON<Partial<SiteContent>>(KEY, {});
    if (!writeJSON(KEY, { ...saved, [key]: value })) throw new Error('Não foi possível salvar neste navegador.');
    invalidate('content');
    return;
  }
  if (key === 'testimonials') {
    const list = value as Testimonial[];
    for (const t of list) {
      const row = { author: t.author, text: t.text, authorized: t.authorized, published: t.published && t.authorized, authorized_at: t.authorized ? new Date().toISOString() : null };
      const { error } = t.id.startsWith('novo-') ? await supabase.from('testimonials').insert(row) : await supabase.from('testimonials').update(row).eq('id', t.id);
      if (error) throw new Error('Não foi possível salvar os depoimentos.');
    }
  } else {
    const { error } = await supabase.from('site_content').upsert({ key, value });
    if (error) throw new Error('Não foi possível salvar. Verifique sua permissão.');
  }
  invalidate('content');
}

export function resetDemoContent() {
  writeJSON(KEY, {});
  invalidate('content');
}
