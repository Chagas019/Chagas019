import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { z } from 'zod';
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Save, Star, Trash2, Upload, Wand2 } from 'lucide-react';
import type { FloorPlan, LifestyleId, Media, Model3D, Property, PropertyTag } from '@/types/property';
import { TLink } from '@/components/ui/TLink';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { useAllProperties } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { saveProperty, uploadMedia } from '@/services/properties';
import { slugify, TYPE_LABEL } from '@/lib/format';
import { cameraPresetsFromPlan } from '@/lib/plan3d';
import { defaultContent } from '@/data/content';

const schema = z.object({
  name: z.string().trim().min(3, 'Mínimo de 3 caracteres').max(120),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use letras minúsculas, números e hífens'),
  price: z.number({ invalid_type_error: 'Informe o preço' }).positive('O preço precisa ser maior que zero'),
  city: z.string().trim().min(2, 'Informe a cidade'),
  neighborhood: z.string().trim().min(2, 'Informe o bairro'),
  suites: z.number().min(0),
  bedrooms: z.number().min(0),
  cover: z.object({ src: z.string().min(1, 'Defina a imagem principal') }),
}).refine((p) => p.suites <= p.bedrooms || p.bedrooms === 0, { path: ['suites'], message: 'Suítes não podem passar do número de quartos' });

const blank = (): Property => ({
  id: '', slug: '', name: '', type: 'casa', purpose: 'venda', price: 0, city: '', neighborhood: '', state: '',
  bedrooms: 0, suites: 0, bathrooms: 0, parking: 0, headline: '', description: '', internalFeatures: [], externalFeatures: [],
  tags: [], lifestyle: [], featured: false, status: 'rascunho', demo: false,
  cover: { src: '', alt: '', width: 1600, height: 1067 }, gallery: [], documentsAuthorized: false, createdAt: '', updatedAt: '',
});

export default function AdminPropertyEdit() {
  const { id } = useParams();
  const isNew = id === 'novo';
  const { data, loading, error } = useAllProperties();
  const navigate = useNavigate();
  const toast = useToast();
  const original = useMemo(() => (isNew ? blank() : data?.find((p) => p.id === id)), [data, id, isNew]);
  const [p, setP] = useState<Property | undefined>(original);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => { if (original && (!p || p.id !== original.id)) setP(structuredClone(original)); }, [original]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) return <ErrorState text={error.message} />;
  if (!p) return <ErrorState title="Imóvel não encontrado" />;

  const set = <K extends keyof Property>(k: K, v: Property[K]) => { setP((s) => ({ ...s!, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })); };
  const num = (v: string) => (v === '' ? undefined : Number(v));

  const upload = async (files: FileList | null, folder: string, onUrl: (url: string, file: File) => void) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of [...files]) onUrl(await uploadMedia(f, `${p.slug || 'novo'}/${folder}`), f);
      toast.show('Arquivo enviado', { tone: 'success' });
    } catch (e) { toast.show((e as Error).message, { tone: 'error' }); } finally { setUploading(false); }
  };

  const save = async () => {
    const r = schema.safeParse(p);
    if (!r.success) {
      const errs: Record<string, string> = {};
      r.error.issues.forEach((i) => { errs[String(i.path[0])] ??= i.message; });
      setErrors(errs);
      toast.show('Revise os campos destacados', { tone: 'error' });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveProperty(p);
      toast.show('Imóvel salvo', { tone: 'success', description: saved.status === 'publicado' ? 'Já está no site.' : 'Ainda não publicado.' });
      if (isNew) navigate(`/admin/imoveis/${saved.id}`, { replace: true });
    } catch (e) { toast.show((e as Error).message, { tone: 'error' }); } finally { setSaving(false); }
  };

  const gallery = p.gallery;
  const moveImg = (i: number, d: number) => { const g = [...gallery]; const [m] = g.splice(i, 1); g.splice(i + d, 0, m); set('gallery', g); };
  const vectorPlan = p.floorPlan?.kind === 'vetorial' ? p.floorPlan : undefined;
  const rooms = p.model3d ? Object.entries(p.model3d.rooms) : [];
  const setModel = (m: Partial<Model3D>) => set('model3d', { ...(p.model3d as Model3D), ...m });

  return (
    <div className="max-w-5xl pb-24">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <TLink to="/admin/imoveis" className="mb-2 inline-flex items-center gap-1.5 text-sm text-mist hover:text-paper"><ArrowLeft size={14} /> Imóveis</TLink>
          <h1 className="text-display-sm font-medium">{isNew ? 'Cadastrar imóvel' : p.name}</h1>
        </div>
        <div className="flex gap-2">
          {!isNew && p.status === 'publicado' && <a href={`/imovel/${p.slug}`} target="_blank" rel="noreferrer" className="btn-ghost border-white/15">Ver no site</a>}
          <button type="button" className="btn-primary" onClick={save} disabled={saving || uploading}><Save size={16} /> {saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </div>

      <div className="space-y-6">
        <Section title="Publicação">
          <Grid>
            <Sel label="Status" value={p.status} onChange={(v) => set('status', v as Property['status'])} options={[['rascunho', 'Rascunho'], ['publicado', 'Publicado'], ['arquivado', 'Arquivado']]} />
            <Check label="Destaque na página inicial" checked={p.featured} onChange={(v) => set('featured', v)} />
            <Check label="Imóvel de demonstração (fictício)" checked={p.demo} onChange={(v) => set('demo', v)} />
          </Grid>
          <fieldset className="mt-4"><legend className="field-label">Etiquetas (use só quando forem verdadeiras)</legend>
            <div className="flex flex-wrap gap-4">{(['lancamento', 'exclusivo'] as PropertyTag[]).map((t) => <Check key={t} label={t === 'lancamento' ? 'Lançamento' : 'Exclusivo'} checked={p.tags.includes(t)} onChange={(v) => set('tags', v ? [...p.tags, t] : p.tags.filter((x) => x !== t))} />)}</div>
            <p className="mt-1 text-xs text-mist">“Recém-adicionado” é automático: aparece nos primeiros 21 dias após o cadastro.</p>
          </fieldset>
          <fieldset className="mt-4"><legend className="field-label">Categorias de estilo de vida</legend>
            <div className="flex flex-wrap gap-4">{defaultContent.categories.map((c) => <Check key={c.id} label={c.label} checked={p.lifestyle.includes(c.id)} onChange={(v) => set('lifestyle', v ? [...p.lifestyle, c.id as LifestyleId] : p.lifestyle.filter((x) => x !== c.id))} />)}</div>
          </fieldset>
        </Section>

        <Section title="Informações principais">
          <Grid>
            <Text label="Nome" value={p.name} error={errors.name} onChange={(v) => { set('name', v); if (isNew || !p.slug) set('slug', slugify(v)); }} />
            <Text label="Endereço da página (slug)" value={p.slug} error={errors.slug} onChange={(v) => set('slug', slugify(v))} hint={`/imovel/${p.slug || '…'}`} />
            <Sel label="Tipo" value={p.type} onChange={(v) => set('type', v as Property['type'])} options={Object.entries(TYPE_LABEL)} />
            <Sel label="Finalidade" value={p.purpose} onChange={(v) => set('purpose', v as Property['purpose'])} options={[['venda', 'Venda'], ['aluguel', 'Aluguel']]} />
            <Num label={p.purpose === 'aluguel' ? 'Aluguel (R$/mês)' : 'Preço (R$)'} value={p.price || undefined} error={errors.price} onChange={(v) => set('price', v ?? 0)} />
            <Num label="Condomínio (R$/mês) — vazio se não houver" value={p.condoFee} onChange={(v) => set('condoFee', v)} />
            <Num label="IPTU (R$/ano)" value={p.iptu} onChange={(v) => set('iptu', v)} />
          </Grid>
        </Section>

        <Section title="Localização">
          <Grid>
            <Text label="Cidade" value={p.city} error={errors.city} onChange={(v) => set('city', v)} />
            <Text label="Bairro" value={p.neighborhood} error={errors.neighborhood} onChange={(v) => set('neighborhood', v)} />
            <Text label="UF" value={p.state} onChange={(v) => set('state', v.toUpperCase().slice(0, 2))} />
          </Grid>
          <p className="mb-3 mt-5 text-xs text-mist">Coordenadas aproximadas (opcional): o site mostra só a região, nunca o endereço. Use um ponto do bairro, não do imóvel.</p>
          <Grid>
            <Num label="Latitude" step="0.0001" value={p.approxLocation?.lat} onChange={(v) => set('approxLocation', v === undefined ? undefined : { lat: v, lng: p.approxLocation?.lng ?? 0, radiusM: p.approxLocation?.radiusM ?? 800 })} />
            <Num label="Longitude" step="0.0001" value={p.approxLocation?.lng} onChange={(v) => p.approxLocation && set('approxLocation', { ...p.approxLocation, lng: v ?? 0 })} />
            <Num label="Raio da área (m)" value={p.approxLocation?.radiusM} onChange={(v) => p.approxLocation && set('approxLocation', { ...p.approxLocation, radiusM: Math.min(5000, Math.max(200, v ?? 800)) })} />
          </Grid>
        </Section>

        <Section title="Medidas e cômodos">
          <Grid>
            <Num label="Área construída (m²)" value={p.builtArea} onChange={(v) => set('builtArea', v)} />
            <Num label="Área do terreno (m²)" value={p.landArea} onChange={(v) => set('landArea', v)} />
            <Num label="Quartos" value={p.bedrooms} onChange={(v) => set('bedrooms', v ?? 0)} />
            <Num label="Suítes" value={p.suites} error={errors.suites} onChange={(v) => set('suites', v ?? 0)} />
            <Num label="Banheiros" value={p.bathrooms} onChange={(v) => set('bathrooms', v ?? 0)} />
            <Num label="Vagas" value={p.parking} onChange={(v) => set('parking', v ?? 0)} />
            <Num label="Ano de construção" value={p.yearBuilt} onChange={(v) => set('yearBuilt', v)} />
            <Text label="Arquiteto / escritório" value={p.architect ?? ''} onChange={(v) => set('architect', v || undefined)} />
          </Grid>
        </Section>

        <Section title="Descrição">
          <Text label="Chamada (uma frase)" value={p.headline} onChange={(v) => set('headline', v)} />
          <Area label="Descrição completa (parágrafos separados por linha em branco)" rows={7} value={p.description} onChange={(v) => set('description', v)} />
          <Grid cols={2}>
            <Area label="Características internas (uma por linha)" value={p.internalFeatures.join('\n')} onChange={(v) => set('internalFeatures', v.split('\n').map((s) => s.trim()).filter(Boolean))} />
            <Area label="Características externas (uma por linha)" value={p.externalFeatures.join('\n')} onChange={(v) => set('externalFeatures', v.split('\n').map((s) => s.trim()).filter(Boolean))} />
          </Grid>
        </Section>

        <Section title="Fotos e vídeo">
          {errors.cover && <p className="field-error mb-3">{errors.cover}</p>}
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gallery.map((m, i) => (
              <li key={m.src + i} className={`rounded-lg border p-2 ${p.cover.src === m.src ? 'border-signal' : 'border-white/10'}`}>
                <img src={m.thumb ?? m.src} alt="" className="aspect-[3/2] w-full rounded object-cover" />
                <label className="mt-2 block"><span className="sr-only">Texto alternativo</span><input className="field min-h-[36px] text-sm" placeholder="Descrição da foto (texto alternativo)" value={m.alt} onChange={(e) => set('gallery', gallery.map((g, j) => (j === i ? { ...g, alt: e.target.value } : g)))} /></label>
                <label className="mt-1.5 block"><span className="sr-only">Ambiente</span><input className="field min-h-[36px] text-sm" placeholder="Ambiente (id, ex.: sala)" value={m.roomId ?? ''} onChange={(e) => set('gallery', gallery.map((g, j) => (j === i ? { ...g, roomId: e.target.value || undefined } : g)))} /></label>
                <div className="mt-2 flex gap-1">
                  <button type="button" className="btn-icon h-8 w-8" title="Definir como principal" aria-label="Definir como imagem principal" onClick={() => set('cover', m)}><Star size={13} className={p.cover.src === m.src ? 'fill-signal text-signal' : ''} /></button>
                  <button type="button" className="btn-icon h-8 w-8" disabled={i === 0} aria-label="Mover para cima" onClick={() => moveImg(i, -1)}><ArrowUp size={13} /></button>
                  <button type="button" className="btn-icon h-8 w-8" disabled={i === gallery.length - 1} aria-label="Mover para baixo" onClick={() => moveImg(i, 1)}><ArrowDown size={13} /></button>
                  <button type="button" className="btn-icon ml-auto h-8 w-8" aria-label="Remover foto" onClick={() => set('gallery', gallery.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <FileButton label="Enviar fotos" icon={<ImagePlus size={15} />} accept="image/webp,image/jpeg,image/png,image/avif" multiple disabled={uploading} onFiles={(f) => upload(f, 'fotos', (url, file) => {
              const img = new Image();
              img.onload = () => setP((s) => {
                const m: Media = { src: url, alt: file.name.replace(/\.\w+$/, ''), width: img.naturalWidth, height: img.naturalHeight };
                return { ...s!, gallery: [...s!.gallery, m], cover: s!.cover.src ? s!.cover : m };
              });
              img.src = url;
            })} />
          </div>
          <Grid cols={2}>
            <Text label="Vídeo (URL .mp4), opcional" value={p.video?.src ?? ''} onChange={(v) => set('video', v ? { src: v, caption: p.video?.caption ?? 'Vídeo do imóvel', poster: p.video?.poster } : undefined)} />
            <Text label="Legenda do vídeo" value={p.video?.caption ?? ''} onChange={(v) => p.video && set('video', { ...p.video, caption: v })} />
          </Grid>
        </Section>

        <Section title="Planta baixa">
          <p className="text-sm text-mist">{p.floorPlan ? (p.floorPlan.kind === 'vetorial' ? `Planta vetorial com ${p.floorPlan.levels.length} pavimento(s) — interativa, com áreas calculadas.` : 'Planta em imagem — zoom e marcadores, sem medidas calculadas.') : 'Sem planta.'}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FileButton label="Planta vetorial (.json)" icon={<Upload size={15} />} accept="application/json,.json" onFiles={async (f) => {
              try {
                const plan = JSON.parse(await f![0].text()) as FloorPlan;
                if (plan.kind !== 'vetorial' || !Array.isArray(plan.levels)) throw new Error();
                set('floorPlan', plan);
                toast.show('Planta vetorial carregada', { tone: 'success' });
              } catch { toast.show('Arquivo inválido: use o formato VectorFloorPlan (veja docs/planta.md)', { tone: 'error' }); }
            }} />
            <FileButton label="Planta em imagem" icon={<ImagePlus size={15} />} accept="image/*" disabled={uploading} onFiles={(f) => upload(f, 'planta', (url) => {
              const img = new Image();
              img.onload = () => set('floorPlan', { kind: 'imagem', source: 'Planta enviada pela imobiliária (imagem).', levels: [{ id: 'unico', name: 'Planta', image: { src: url, alt: `Planta de ${p.name}`, width: img.naturalWidth, height: img.naturalHeight }, hotspots: [] }] });
              img.src = url;
            })} />
            {p.floorPlan && <button type="button" className="btn-ghost border-white/15" onClick={() => set('floorPlan', undefined)}><Trash2 size={15} /> Remover planta</button>}
          </div>
          {p.floorPlan?.kind === 'imagem' && (
            <div className="mt-4">
              <p className="field-label">Marcadores dos ambientes (posição em % da imagem)</p>
              {p.floorPlan.levels[0].hotspots.map((h, i) => (
                <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_80px_80px_90px_40px] gap-2">
                  {(['roomId', 'name'] as const).map((k) => <input key={k} aria-label={k === 'roomId' ? 'Id do ambiente' : 'Nome'} className="field min-h-[38px] text-sm" placeholder={k === 'roomId' ? 'id' : 'Nome'} value={h[k]} onChange={(e) => updateHotspot(i, { [k]: e.target.value })} />)}
                  {(['x', 'y', 'area'] as const).map((k) => <input key={k} aria-label={k} type="number" className="field min-h-[38px] text-sm" placeholder={k} value={h[k] ?? ''} onChange={(e) => updateHotspot(i, { [k]: num(e.target.value) })} />)}
                  <button type="button" className="btn-icon h-[38px] w-10" aria-label="Remover marcador" onClick={() => updateHotspot(i, null)}><Trash2 size={13} /></button>
                </div>
              ))}
              <button type="button" className="btn-ghost border-white/15" onClick={() => updateHotspot(-1, { roomId: '', name: '', x: 50, y: 50 })}>Adicionar marcador</button>
            </div>
          )}
        </Section>

        <Section title="Modelo 3D e ambientes">
          <p className="text-sm text-mist">Envie um .glb (glTF binário, de preferência comprimido com meshopt e texturas até 2048 px). Grupos chamados <code>level_&lt;id&gt;</code> e <code>roof_&lt;id&gt;</code> ativam o corte por pavimento; materiais <code>nx_lamp</code> acendem no modo noturno.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <FileButton label="Enviar .glb" icon={<Upload size={15} />} accept=".glb,.gltf,model/gltf-binary" disabled={uploading} onFiles={(f) => upload(f, 'modelo', (url, file) => set('model3d', {
              url, demonstrative: false, initialView: p.model3d?.initialView ?? { position: [24, 16, 26], target: [0, 2, 0] }, rooms: p.model3d?.rooms ?? (vectorPlan ? cameraPresetsFromPlan(vectorPlan) : {}),
              hasNightLighting: p.model3d?.hasNightLighting ?? false, sizeMb: Math.round((file.size / 1048576) * 10) / 10,
            }))} />
            {p.model3d && <button type="button" className="btn-ghost border-white/15" onClick={() => set('model3d', undefined)}><Trash2 size={15} /> Remover modelo</button>}
            {p.model3d && vectorPlan && <button type="button" className="btn-ghost border-white/15" onClick={() => setModel({ rooms: cameraPresetsFromPlan(vectorPlan) })}><Wand2 size={15} /> Gerar câmeras a partir da planta</button>}
          </div>
          {p.model3d && (
            <div className="mt-4 space-y-4">
              <Grid>
                <Text label="URL do modelo" value={p.model3d.url} onChange={(v) => setModel({ url: v })} />
                <Check label="Modelo demonstrativo (ilustrativo)" checked={p.model3d.demonstrative} onChange={(v) => setModel({ demonstrative: v })} />
                <Check label="Tem iluminação noturna" checked={p.model3d.hasNightLighting} onChange={(v) => setModel({ hasNightLighting: v })} />
              </Grid>
              <div>
                <p className="field-label">Hotspots dos ambientes — posição da câmera e ponto observado (x, y, z em metros)</p>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="text-left text-xs text-mist"><tr><th className="py-1 font-normal">Id</th><th className="font-normal">Nome</th><th className="font-normal">Interno</th><th className="font-normal">Câmera</th><th className="font-normal">Alvo</th><th /></tr></thead>
                    <tbody>
                      {rooms.map(([rid, r]) => (
                        <tr key={rid}>
                          <td className="py-1 pr-2 font-mono text-xs">{rid}</td>
                          <td className="pr-2"><input aria-label="Nome do ambiente" className="field min-h-[34px] text-sm" value={r.label} onChange={(e) => setModel({ rooms: { ...p.model3d!.rooms, [rid]: { ...r, label: e.target.value } } })} /></td>
                          <td className="pr-2"><input aria-label="Ambiente interno" type="checkbox" className="h-4 w-4 accent-signal" checked={r.interior} onChange={(e) => setModel({ rooms: { ...p.model3d!.rooms, [rid]: { ...r, interior: e.target.checked } } })} /></td>
                          <td className="pr-2"><Vec value={r.position} onChange={(v) => setModel({ rooms: { ...p.model3d!.rooms, [rid]: { ...r, position: v } } })} /></td>
                          <td className="pr-2"><Vec value={r.target} onChange={(v) => setModel({ rooms: { ...p.model3d!.rooms, [rid]: { ...r, target: v } } })} /></td>
                          <td><button type="button" className="btn-icon h-8 w-8" aria-label={`Remover ${r.label}`} onClick={() => { const { [rid]: _, ...rest } = p.model3d!.rooms; void _; setModel({ rooms: rest }); }}><Trash2 size={13} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="btn-ghost mt-2 border-white/15" onClick={() => { const rid = prompt('Id do ambiente (igual ao da planta, ex.: cozinha)'); if (rid) setModel({ rooms: { ...p.model3d!.rooms, [slugify(rid)]: { label: rid, interior: true, position: [0, 1.6, 4], target: [0, 1, 0] } } }); }}>Adicionar ambiente</button>
              </div>
            </div>
          )}
        </Section>

        <Section title="Documentos e informações técnicas">
          <Check label="Proprietário autorizou exibir no site" checked={p.documentsAuthorized} onChange={(v) => set('documentsAuthorized', v)} />
          {(p.documents ?? []).map((d, i) => (
            <div key={i} className="mt-2 grid grid-cols-[1fr_2fr_40px] gap-2">
              <input aria-label="Rótulo" className="field min-h-[38px] text-sm" value={d.label} onChange={(e) => set('documents', p.documents!.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input aria-label="Valor" className="field min-h-[38px] text-sm" value={d.value} onChange={(e) => set('documents', p.documents!.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <button type="button" className="btn-icon h-[38px] w-10" aria-label="Remover" onClick={() => set('documents', p.documents!.filter((_, j) => j !== i))}><Trash2 size={13} /></button>
            </div>
          ))}
          <button type="button" className="btn-ghost mt-3 border-white/15" onClick={() => set('documents', [...(p.documents ?? []), { label: '', value: '' }])}>Adicionar informação</button>
        </Section>

        <Section title="SEO">
          <Text label="Título da página (vazio = automático)" value={p.seo?.title ?? ''} onChange={(v) => set('seo', { ...p.seo, title: v || undefined })} hint={`${(p.seo?.title ?? '').length}/60 caracteres recomendados`} />
          <Area label="Descrição para buscadores (vazio = automática)" rows={2} value={p.seo?.description ?? ''} onChange={(v) => set('seo', { ...p.seo, description: v || undefined })} />
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-ink/95 p-3 backdrop-blur md:left-[240px]">
        <div className="flex max-w-5xl justify-end gap-2 md:px-5"><button type="button" className="btn-primary" onClick={save} disabled={saving || uploading}><Save size={16} /> {saving ? 'Salvando…' : uploading ? 'Enviando arquivo…' : 'Salvar alterações'}</button></div>
      </div>
    </div>
  );

  function updateHotspot(i: number, patch: Record<string, unknown> | null) {
    if (p?.floorPlan?.kind !== 'imagem') return;
    const lvl = p.floorPlan.levels[0];
    let hs = [...lvl.hotspots];
    if (i < 0) hs.push(patch as (typeof hs)[number]);
    else if (patch === null) hs = hs.filter((_, j) => j !== i);
    else hs[i] = { ...hs[i], ...patch };
    set('floorPlan', { ...p.floorPlan, levels: [{ ...lvl, hotspots: hs }] });
  }
}

/* ---------- campos ---------- */
let n = 0;
const fid = () => `adm-${++n}`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section className="surface p-5 md:p-6"><h2 className="mb-4 text-lg font-medium">{title}</h2>{children}</section>;
}
function Grid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 }) {
  return <div className={`mt-3 grid gap-4 sm:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : ''}`}>{children}</div>;
}
function Text({ label, value, onChange, error, hint }: { label: string; value: string; onChange: (v: string) => void; error?: string; hint?: string }) {
  const [id] = useState(fid);
  return <div><label htmlFor={id} className="field-label">{label}</label><input id={id} className="field" value={value} aria-invalid={!!error} onChange={(e) => onChange(e.target.value)} />{error ? <p className="field-error">{error}</p> : hint ? <p className="mt-1 text-xs text-mist">{hint}</p> : null}</div>;
}
function Num({ label, value, onChange, error, step }: { label: string; value?: number; onChange: (v?: number) => void; error?: string; step?: string }) {
  const [id] = useState(fid);
  return <div><label htmlFor={id} className="field-label">{label}</label><input id={id} type="number" inputMode="decimal" min={0} step={step ?? 'any'} className="field" value={value ?? ''} aria-invalid={!!error} onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))} />{error && <p className="field-error">{error}</p>}</div>;
}
function Area({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  const [id] = useState(fid);
  return <div className="mt-3"><label htmlFor={id} className="field-label">{label}</label><textarea id={id} rows={rows} className="field" value={value} onChange={(e) => onChange(e.target.value)} /></div>;
}
function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  const [id] = useState(fid);
  return <div><label htmlFor={id} className="field-label">{label}</label><select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
}
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm"><input type="checkbox" className="h-4 w-4 accent-signal" checked={checked} onChange={(e) => onChange(e.target.checked)} />{label}</label>;
}
function Vec({ value, onChange }: { value: [number, number, number]; onChange: (v: [number, number, number]) => void }) {
  return (
    <div className="flex gap-1">
      {value.map((c, i) => <input key={i} aria-label={['x', 'y', 'z'][i]} type="number" step="0.1" className="field min-h-[34px] w-[4.5rem] px-2 text-xs" value={c} onChange={(e) => { const v = [...value] as [number, number, number]; v[i] = Number(e.target.value); onChange(v); }} />)}
    </div>
  );
}
function FileButton({ label, icon, accept, multiple, disabled, onFiles }: { label: string; icon: ReactNode; accept: string; multiple?: boolean; disabled?: boolean; onFiles: (f: FileList | null) => void }) {
  const [id] = useState(fid);
  return (
    <label htmlFor={id} className={`btn-ghost cursor-pointer border-white/15 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
      {icon} {label}
      <input id={id} type="file" className="sr-only" accept={accept} multiple={multiple} disabled={disabled} onChange={(e) => { onFiles(e.target.files); e.target.value = ''; }} />
    </label>
  );
}
