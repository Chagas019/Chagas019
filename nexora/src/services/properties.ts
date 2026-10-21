/**
 * Serviço de imóveis. Com Supabase: tabela public.properties (RLS decide o que cada um vê).
 * Em modo demonstração: dados de src/data/properties.ts + alterações do painel guardadas neste navegador.
 */
import type { Property, PublicationStatus } from '@/types/property';
import { demoProperties } from '@/data/properties';
import { MEDIA_BUCKET, supabase } from '@/lib/supabase';
import { readJSON, uid, writeJSON } from '@/lib/storage';
import { invalidate } from './query';

const DEMO_KEY = 'nexora:demo:properties';

type Row = Record<string, unknown>;

export function fromRow(r: Row): Property {
  return {
    id: String(r.id),
    slug: String(r.slug),
    name: String(r.name),
    type: r.type as Property['type'],
    purpose: r.purpose as Property['purpose'],
    price: Number(r.price),
    condoFee: r.condo_fee == null ? undefined : Number(r.condo_fee),
    iptu: r.iptu == null ? undefined : Number(r.iptu),
    city: String(r.city),
    neighborhood: String(r.neighborhood),
    state: String(r.state ?? ''),
    approxLocation: r.approx_lat != null && r.approx_lng != null ? { lat: Number(r.approx_lat), lng: Number(r.approx_lng), radiusM: Number(r.approx_radius_m ?? 800) } : undefined,
    builtArea: r.built_area == null ? undefined : Number(r.built_area),
    landArea: r.land_area == null ? undefined : Number(r.land_area),
    bedrooms: Number(r.bedrooms ?? 0),
    suites: Number(r.suites ?? 0),
    bathrooms: Number(r.bathrooms ?? 0),
    parking: Number(r.parking ?? 0),
    headline: String(r.headline ?? ''),
    description: String(r.description ?? ''),
    internalFeatures: (r.internal_features as string[]) ?? [],
    externalFeatures: (r.external_features as string[]) ?? [],
    tags: (r.tags as Property['tags']) ?? [],
    lifestyle: (r.lifestyle as Property['lifestyle']) ?? [],
    featured: Boolean(r.featured),
    status: r.status as PublicationStatus,
    demo: Boolean(r.demo),
    cover: r.cover as Property['cover'],
    gallery: (r.gallery as Property['gallery']) ?? [],
    video: (r.video as Property['video']) ?? undefined,
    floorPlan: (r.floor_plan as Property['floorPlan']) ?? undefined,
    model3d: (r.model3d as Property['model3d']) ?? undefined,
    panoramas: (r.panoramas as Property['panoramas']) ?? undefined,
    documents: (r.property_documents as { label: string; value: string }[] | undefined)?.map(({ label, value }) => ({ label, value })),
    documentsAuthorized: Boolean(r.documents_authorized),
    architect: (r.architect as string) ?? undefined,
    yearBuilt: (r.year_built as number) ?? undefined,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
    seo: (r.seo as Property['seo']) ?? undefined,
  };
}

export function toRow(p: Property): Row {
  return {
    slug: p.slug, name: p.name, type: p.type, purpose: p.purpose, price: p.price,
    condo_fee: p.condoFee ?? null, iptu: p.iptu ?? null, city: p.city, neighborhood: p.neighborhood, state: p.state,
    approx_lat: p.approxLocation?.lat ?? null, approx_lng: p.approxLocation?.lng ?? null, approx_radius_m: p.approxLocation?.radiusM ?? null,
    built_area: p.builtArea ?? null, land_area: p.landArea ?? null, bedrooms: p.bedrooms, suites: p.suites, bathrooms: p.bathrooms, parking: p.parking,
    headline: p.headline, description: p.description, internal_features: p.internalFeatures, external_features: p.externalFeatures,
    tags: p.tags, lifestyle: p.lifestyle, featured: p.featured, status: p.status, demo: p.demo,
    cover: p.cover, gallery: p.gallery, video: p.video ?? null, floor_plan: p.floorPlan ?? null, model3d: p.model3d ?? null, panoramas: p.panoramas ?? null,
    documents_authorized: p.documentsAuthorized, architect: p.architect ?? null, year_built: p.yearBuilt ?? null, seo: p.seo ?? null,
  };
}

/* ---------- modo demonstração ---------- */
interface DemoOverrides { edited: Record<string, Property>; created: Property[] }
const readDemo = () => readJSON<DemoOverrides>(DEMO_KEY, { edited: {}, created: [] });
function demoAll(): Property[] {
  const o = readDemo();
  return [...demoProperties.map((p) => o.edited[p.id] ?? p), ...o.created];
}

const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 120));

/* ---------- API pública ---------- */
export async function listPublished(): Promise<Property[]> {
  if (!supabase) return delay(demoAll().filter((p) => p.status === 'publicado'));
  const { data, error } = await supabase.from('properties').select('*').eq('status', 'publicado').order('created_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar os imóveis.');
  return (data ?? []).map(fromRow);
}

export async function getBySlug(slug: string): Promise<Property | null> {
  if (!supabase) return delay(demoAll().find((p) => p.slug === slug && p.status === 'publicado') ?? null);
  const { data, error } = await supabase.from('properties').select('*, property_documents(label, value, sort)').eq('slug', slug).maybeSingle();
  if (error) throw new Error('Não foi possível carregar o imóvel.');
  return data ? fromRow(data) : null;
}

/** Painel: todos os status (RLS só devolve rascunhos para a equipe) */
export async function listAll(): Promise<Property[]> {
  if (!supabase) return delay(demoAll());
  const { data, error } = await supabase.from('properties').select('*, property_documents(label, value, sort)').order('updated_at', { ascending: false });
  if (error) throw new Error('Não foi possível carregar os imóveis.');
  return (data ?? []).map(fromRow);
}

export async function saveProperty(p: Property): Promise<Property> {
  const now = new Date().toISOString();
  if (!supabase) {
    const o = readDemo();
    const isBase = demoProperties.some((d) => d.id === p.id);
    const slugTaken = demoAll().some((x) => x.slug === p.slug && x.id !== p.id);
    if (slugTaken) throw new Error('Já existe um imóvel com este endereço (slug).');
    const saved = { ...p, id: p.id || `local-${uid()}`, updatedAt: now, createdAt: p.createdAt || now };
    if (isBase) o.edited[saved.id] = saved;
    else o.created = [...o.created.filter((c) => c.id !== saved.id), saved];
    if (!writeJSON(DEMO_KEY, o)) throw new Error('O navegador não tem espaço para salvar. Use imagens menores ou conecte o Supabase.');
    invalidate('properties');
    return saved;
  }
  const row = toRow(p);
  const query = p.id && !p.id.startsWith('new') ? supabase.from('properties').update(row).eq('id', p.id) : supabase.from('properties').insert(row);
  const { data, error } = await query.select('*').single();
  if (error) throw new Error(error.code === '23505' ? 'Já existe um imóvel com este endereço (slug).' : 'Não foi possível salvar. Verifique sua permissão.');
  const saved = fromRow(data);
  if (p.documents) {
    await supabase.from('property_documents').delete().eq('property_id', saved.id);
    if (p.documents.length) await supabase.from('property_documents').insert(p.documents.map((d, i) => ({ property_id: saved.id, label: d.label, value: d.value, sort: i })));
  }
  invalidate('properties');
  return saved;
}

export async function setStatus(p: Property, status: PublicationStatus) {
  return saveProperty({ ...p, status });
}

/** Desfaz as alterações locais do modo demonstração */
export function resetDemoData() {
  writeJSON(DEMO_KEY, { edited: {}, created: [] });
  invalidate('properties');
}

/**
 * Envia um arquivo de mídia. Com Supabase vai para o Storage (bucket público, escrita só da equipe).
 * Na demonstração vira uma URL local (data URL) e fica apenas neste navegador.
 */
export async function uploadMedia(file: File, folder: string): Promise<string> {
  const MAX_DEMO = 1.5 * 1024 * 1024;
  if (!supabase) {
    if (file.size > MAX_DEMO) throw new Error('Na demonstração o limite é 1,5 MB por arquivo (o navegador guarda localmente). Conecte o Supabase para enviar arquivos grandes.');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Falha ao ler o arquivo.'));
      reader.readAsDataURL(file);
    });
  }
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  const path = `${folder}/${Date.now()}-${uid().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type || undefined });
  if (error) throw new Error('Falha no envio. Verifique o tamanho e o formato do arquivo.');
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
}
