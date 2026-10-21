import { useEffect, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, Save, Trash2 } from 'lucide-react';
import type { SiteContent, Testimonial } from '@/data/content';
import { Skeleton } from '@/components/ui/States';
import { useContent } from '@/hooks/useData';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { saveContent } from '@/services/content';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const TABS = [['home', 'Página inicial'], ['categories', 'Categorias'], ['contact', 'Contato e dados legais'], ['seo', 'SEO'], ['testimonials', 'Depoimentos'], ['equipe', 'Equipe']] as const;
type TabId = (typeof TABS)[number][0];

export default function AdminContent() {
  const { data, loading } = useContent();
  const [tab, setTab] = useState<TabId>('home');
  const [draft, setDraft] = useState<SiteContent>();
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  useEffect(() => { if (data) setDraft(structuredClone(data)); }, [data]);
  if (loading || !draft) return <Skeleton className="h-96 w-full" />;

  const save = async (key: Exclude<TabId, 'equipe'>) => {
    setSaving(true);
    try { await saveContent(key, draft[key] as never); toast.show('Conteúdo salvo', { tone: 'success' }); } catch (e) { toast.show((e as Error).message, { tone: 'error' }); } finally { setSaving(false); }
  };
  const patch = <K extends keyof SiteContent>(k: K, v: Partial<SiteContent[K]>) => setDraft((d) => ({ ...d!, [k]: Array.isArray(v) ? v : { ...(d![k] as object), ...v } }));

  return (
    <div className="max-w-4xl">
      <h1 className="mb-6 text-display-sm font-medium">Conteúdo do site</h1>
      <div role="tablist" aria-label="Seções de conteúdo" className="no-scrollbar mb-6 flex gap-1 overflow-x-auto border-b border-white/10">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-[44px] shrink-0 border-b px-4 text-sm ${tab === id ? 'border-signal text-paper' : 'border-transparent text-mist hover:text-paper'}`}>{label}</button>
        ))}
      </div>

      {tab === 'home' && (
        <Card onSave={() => save('home')} saving={saving}>
          {([['heroTitle', 'Título da primeira tela'], ['heroSubtitle', 'Subtítulo'], ['heroPrimary', 'Botão principal'], ['heroSecondary', 'Botão secundário'], ['experienceTitle', 'Título da seção 3D'], ['experienceText', 'Texto da seção 3D'], ['ctaTitle', 'Título da chamada final'], ['ctaButton', 'Botão da chamada final']] as const).map(([k, l]) => (
            <Field key={k} label={l} value={draft.home[k]} long={k.includes('Text') || k === 'heroSubtitle'} onChange={(v) => patch('home', { [k]: v })} />
          ))}
        </Card>
      )}

      {tab === 'categories' && (
        <Card onSave={() => save('categories')} saving={saving}>
          {draft.categories.map((c, i) => (
            <div key={c.id} className="grid gap-3 border-b border-white/10 pb-4 sm:grid-cols-[1fr_2fr_auto]">
              <Field label="Nome" value={c.label} onChange={(v) => patch('categories', draft.categories.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
              <Field label="Descrição" value={c.description} onChange={(v) => patch('categories', draft.categories.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
              <div className="flex items-end gap-1 pb-0.5">
                <label className="flex min-h-[44px] items-center gap-2 pr-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-signal" checked={c.visible} onChange={(e) => patch('categories', draft.categories.map((x, j) => (j === i ? { ...x, visible: e.target.checked } : x)))} /> Visível</label>
                <button type="button" className="btn-icon h-10 w-10" aria-label="Subir" disabled={i === 0} onClick={() => { const a = [...draft.categories]; [a[i - 1], a[i]] = [a[i], a[i - 1]]; patch('categories', a); }}><ArrowUp size={14} /></button>
                <button type="button" className="btn-icon h-10 w-10" aria-label="Descer" disabled={i === draft.categories.length - 1} onClick={() => { const a = [...draft.categories]; [a[i + 1], a[i]] = [a[i], a[i + 1]]; patch('categories', a); }}><ArrowDown size={14} /></button>
              </div>
            </div>
          ))}
          <p className="text-xs text-mist">Cada categoria leva ao catálogo filtrado. Os imóveis entram em uma categoria pelo campo “Categorias de estilo de vida” do cadastro.</p>
        </Card>
      )}

      {tab === 'contact' && (
        <Card onSave={() => save('contact')} saving={saving}>
          <p className="text-sm text-mist">Campos vazios não aparecem no site. Preencha apenas dados reais da imobiliária.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {([['companyName', 'Nome fantasia'], ['legalName', 'Razão social'], ['cnpj', 'CNPJ'], ['creci', 'CRECI (pessoa jurídica)'], ['email', 'E-mail'], ['phone', 'Telefone'], ['whatsapp', 'WhatsApp (só números, com DDI 55)'], ['hours', 'Horário de atendimento'], ['address', 'Endereço do escritório'], ['instagram', 'Instagram (URL)'], ['linkedin', 'LinkedIn (URL)'], ['youtube', 'YouTube (URL)']] as const).map(([k, l]) => (
              <Field key={k} label={l} value={draft.contact[k]} onChange={(v) => patch('contact', { [k]: k === 'whatsapp' ? v.replace(/\D/g, '') : v })} />
            ))}
          </div>
        </Card>
      )}

      {tab === 'seo' && (
        <Card onSave={() => save('seo')} saving={saving}>
          <Field label="Nome do site" value={draft.seo.siteName} onChange={(v) => patch('seo', { siteName: v })} />
          <Field label="Título padrão" value={draft.seo.defaultTitle} onChange={(v) => patch('seo', { defaultTitle: v })} hint={`${draft.seo.defaultTitle.length}/60`} />
          <Field label="Descrição padrão" long value={draft.seo.defaultDescription} onChange={(v) => patch('seo', { defaultDescription: v })} hint={`${draft.seo.defaultDescription.length}/160`} />
          <p className="text-xs text-mist">Título e descrição de cada imóvel são gerados automaticamente e podem ser personalizados no cadastro do imóvel.</p>
        </Card>
      )}

      {tab === 'testimonials' && (
        <Card onSave={() => save('testimonials')} saving={saving}>
          <p className="text-sm text-mist">Publique apenas depoimentos reais, com autorização registrada do autor. Sem autorização, o depoimento não aparece (o banco também bloqueia).</p>
          {draft.testimonials.length === 0 && <p className="text-sm">Nenhum depoimento cadastrado.</p>}
          {draft.testimonials.map((t, i) => (
            <div key={t.id} className="space-y-3 border-b border-white/10 pb-4">
              <Field label="Autor" value={t.author} onChange={(v) => setT(i, { author: v })} />
              <Field label="Depoimento" long value={t.text} onChange={(v) => setT(i, { text: v })} />
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-signal" checked={t.authorized} onChange={(e) => setT(i, { authorized: e.target.checked, published: e.target.checked && t.published })} /> Autor autorizou a publicação</label>
                <label className="flex items-center gap-2"><input type="checkbox" className="h-4 w-4 accent-signal" disabled={!t.authorized} checked={t.published} onChange={(e) => setT(i, { published: e.target.checked })} /> Publicado</label>
                {t.id.startsWith('novo-') && <button type="button" className="ml-auto inline-flex items-center gap-1 text-mist hover:text-paper" onClick={() => patch('testimonials', draft.testimonials.filter((_, j) => j !== i))}><Trash2 size={13} /> Remover</button>}
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost border-white/15" onClick={() => patch('testimonials', [...draft.testimonials, { id: `novo-${Date.now()}`, author: '', text: '', authorized: false, published: false }])}>Adicionar depoimento</button>
        </Card>
      )}

      {tab === 'equipe' && <TeamPanel />}
    </div>
  );

  function setT(i: number, v: Partial<Testimonial>) {
    patch('testimonials', draft!.testimonials.map((t, j) => (j === i ? { ...t, ...v } : t)));
  }
}

/** Liberar acesso de corretor/admin — chama a função de servidor admin-users (service role fica no servidor) */
function TeamPanel() {
  const { role } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState('corretor');
  const [busy, setBusy] = useState(false);
  if (!isSupabaseConfigured) {
    return <div className="surface p-5 text-sm text-mist">A gestão de acessos depende do Supabase. Depois de configurá-lo, publique a função <code>admin-users</code> (veja o README) e defina o primeiro administrador pelo SQL indicado lá.</div>;
  }
  if (role !== 'admin') return <div className="surface p-5 text-sm text-mist">Somente administradores podem alterar acessos.</div>;
  const submit = async () => {
    setBusy(true);
    const { data, error } = await supabase!.functions.invoke('admin-users', { body: { email, role: newRole } });
    setBusy(false);
    if (error || data?.error) toast.show(data?.error ?? 'Não foi possível alterar o acesso', { tone: 'error' });
    else { toast.show(`${email} agora é ${newRole}`, { tone: 'success' }); setEmail(''); }
  };
  return (
    <div className="surface space-y-4 p-5">
      <p className="text-sm text-mist">A pessoa precisa ter criado uma conta em /entrar. Depois, defina o papel dela aqui.</p>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_auto]">
        <Field label="E-mail" value={email} onChange={setEmail} />
        <label className="block"><span className="field-label">Papel</span><select className="field" value={newRole} onChange={(e) => setNewRole(e.target.value)}><option value="corretor">Corretor</option><option value="admin">Administrador</option><option value="cliente">Cliente (remover acesso)</option></select></label>
        <div className="flex items-end"><button type="button" className="btn-primary" disabled={busy || !email} onClick={submit}>{busy ? 'Aplicando…' : 'Aplicar'}</button></div>
      </div>
    </div>
  );
}

function Card({ children, onSave, saving }: { children: ReactNode; onSave: () => void; saving: boolean }) {
  return (
    <div className="surface space-y-4 p-5 md:p-6">
      {children}
      <div className="flex justify-end border-t border-white/10 pt-4"><button type="button" className="btn-primary" disabled={saving} onClick={onSave}><Save size={15} /> {saving ? 'Salvando…' : 'Salvar'}</button></div>
    </div>
  );
}

let n = 0;
function Field({ label, value, onChange, long, hint }: { label: string; value: string; onChange: (v: string) => void; long?: boolean; hint?: string }) {
  const [id] = useState(() => `ct-${++n}`);
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      {long ? <textarea id={id} rows={3} className="field" value={value} onChange={(e) => onChange(e.target.value)} /> : <input id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)} />}
      {hint && <p className="mt-1 text-xs text-mist">{hint}</p>}
    </div>
  );
}
