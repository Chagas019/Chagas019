"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Loader2, Copy, FileDown, Save, RotateCcw, LayoutTemplate, CheckCircle2, XCircle } from "lucide-react";
import { useApp } from "@/components/providers";
import { Button, Notice, PageHeader, inputCls } from "@/components/ui/primitives";
import { TIPO_LABEL, type Brief, type SermonOutline } from "@/lib/ai/schema";
import { outlineToText } from "@/lib/ai/format";
import { parseReference } from "@/data/catalog";
import { OutlineEditor } from "./outline-editor";

const PUBLICOS = ["Grupo de oração", "Jovens", "Casais", "Adolescentes", "Crianças", "Catequistas", "Servos e ministérios", "Idosos", "Público geral"];
const STEPS = ["Recuperando referências verificadas…", "Estruturando a pregação…", "Conferindo cada referência…"];

type Status = { supabase: boolean; ai: boolean; youtube: boolean };

export function AssistantView() {
  const params = useSearchParams();
  const router = useRouter();
  const { store, user, supabaseConfigured, toast } = useApp();
  const [status, setStatus] = useState<Status | null>(null);
  const [brief, setBrief] = useState<Brief>({
    tema: params.get("tema") ?? "", publico: "Grupo de oração", duracao: 30, objetivo: "", tipo: "grupo-de-oracao", passagem: params.get("passagem") ?? "",
  });
  const [outline, setOutline] = useState<SermonOutline | null>(null);
  const [projectId, setProjectId] = useState<string | null>(params.get("projeto"));
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<{ msg: string; code?: string } | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { fetch("/api/status").then((r) => r.json()).then(setStatus).catch(() => setStatus(null)); }, []);

  useEffect(() => {
    const id = params.get("projeto");
    if (!id) return;
    store.getProject(id).then((p) => {
      if (!p) return;
      setProjectId(p.id);
      if (p.brief && (p.brief as Brief).tema) setBrief(p.brief as Brief);
      if (p.content) setOutline(p.content as SermonOutline);
    }).catch(() => {});
  }, [params, store]);

  useEffect(() => {
    if (!loading) return;
    setStep(0);
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 9000);
    return () => clearInterval(t);
  }, [loading]);

  const passage = useMemo(() => (brief.passagem?.trim() ? parseReference(brief.passagem) : null), [brief.passagem]);
  const needsLogin = Boolean(status?.ai && supabaseConfigured && !user);

  async function generate(modo?: "modelo") {
    setError(null);
    if (brief.tema.trim().length < 3) { setError({ msg: "Informe o tema (pelo menos 3 letras)." }); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...brief, modo }) });
      const data = await res.json();
      if (!res.ok) { setError({ msg: data.error ?? "Falha ao gerar.", code: data.code }); return; }
      setOutline(data.outline);
      setDirty(true);
      if (data.mode === "modelo" && data.reason === "ia-nao-configurada") toast("IA não configurada: geramos um roteiro-base com o catálogo");
      setTimeout(() => document.getElementById("roteiro")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch {
      setError({ msg: "Sem conexão com o servidor. Verifique sua internet e tente de novo." });
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!outline) return;
    try {
      const p = await store.saveProject({
        id: projectId ?? undefined, title: outline.titulo || brief.tema, kind: brief.tipo === "retiro" ? "retiro" : brief.tipo === "encontro" ? "encontro" : brief.tipo === "formacao" ? "formacao" : brief.tipo === "estudo-biblico" ? "estudo" : brief.tipo === "grupo-de-oracao" ? "grupo-de-oracao" : "pregacao",
        brief: brief as unknown as Record<string, unknown>, content: outline,
      });
      setProjectId(p.id);
      setDirty(false);
      router.replace(`/assistente?projeto=${p.id}`, { scroll: false });
      toast(store.mode === "nuvem" ? "Pregação salva no Meu Espaço" : "Pregação salva neste navegador");
    } catch (e) {
      toast(`Não foi possível salvar: ${(e as Error).message}`);
    }
  }

  async function copy() {
    if (!outline) return;
    try { await navigator.clipboard.writeText(outlineToText(outline)); toast("Roteiro copiado"); }
    catch { toast("Seu navegador bloqueou a cópia. Use Exportar PDF."); }
  }

  function reset() {
    if (dirty && !confirm("Descartar o roteiro atual não salvo?")) return;
    setOutline(null); setProjectId(null); setDirty(false); router.replace("/assistente");
  }

  const field = <K extends keyof Brief>(k: K, v: Brief[K]) => setBrief((b) => ({ ...b, [k]: v }));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader eyebrow="Assistente de pregação" title="Preparar minha pregação" description="Conte o essencial. O VERBUM busca referências no catálogo verificado, propõe um roteiro completo e confere cada fonte. Você revisa, edita e leva para a oração." />

        {status && !status.ai && (
          <div className="mb-6"><Notice tone="warn" title="Assistente de IA não configurado neste servidor">
            Você ainda pode gerar um <strong>roteiro-base</strong>: a estrutura completa com perícopes, Catecismo, documentos e músicas do catálogo, para você escrever o conteúdo. Para ativar a IA, o administrador deve definir <code>ANTHROPIC_API_KEY</code> (veja Configurações).
          </Notice></div>
        )}
        {needsLogin && (
          <div className="mb-6"><Notice title="Entre para usar a IA">O assistente de IA exige uma conta (para respeitar os limites do plano). <Link className="font-semibold underline" href="/entrar?voltar=/assistente">Entrar ou criar conta</Link>. O roteiro-base continua disponível sem login.</Notice></div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); generate(status && !status.ai ? "modelo" : undefined); }} className="grid gap-5 rounded-3xl border border-ivory-300/70 bg-white/85 p-6 shadow-card md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="tema" className="mb-1.5 block text-sm font-semibold text-royal-900">Tema *</label>
            <input id="tema" required minLength={3} maxLength={200} className={inputCls} value={brief.tema} onChange={(e) => field("tema", e.target.value)} placeholder="ex.: O perdão que liberta" />
          </div>
          <div>
            <label htmlFor="publico" className="mb-1.5 block text-sm font-semibold text-royal-900">Público</label>
            <input id="publico" list="publicos" maxLength={120} className={inputCls} value={brief.publico} onChange={(e) => field("publico", e.target.value)} />
            <datalist id="publicos">{PUBLICOS.map((p) => <option key={p} value={p} />)}</datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="duracao" className="mb-1.5 block text-sm font-semibold text-royal-900">Duração (min)</label>
              <input id="duracao" type="number" min={5} max={180} className={inputCls} value={brief.duracao} onChange={(e) => field("duracao", Math.max(5, Math.min(180, Number(e.target.value) || 5)))} />
            </div>
            <div>
              <label htmlFor="tipo" className="mb-1.5 block text-sm font-semibold text-royal-900">Tipo de encontro</label>
              <select id="tipo" className={inputCls} value={brief.tipo} onChange={(e) => field("tipo", e.target.value as Brief["tipo"])}>
                {Object.entries(TIPO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="objetivo" className="mb-1.5 block text-sm font-semibold text-royal-900">Objetivo da pregação</label>
            <textarea id="objetivo" rows={3} maxLength={400} className={inputCls} value={brief.objetivo} onChange={(e) => field("objetivo", e.target.value)} placeholder="ex.: Levar os jovens a darem o primeiro passo para a confissão" />
          </div>
          <div>
            <label htmlFor="passagem" className="mb-1.5 block text-sm font-semibold text-royal-900">Passagem bíblica <span className="font-normal text-ink-mute">(opcional)</span></label>
            <input id="passagem" maxLength={60} className={inputCls} value={brief.passagem} onChange={(e) => field("passagem", e.target.value)} placeholder="ex.: Lc 15,11-32" aria-describedby="passagem-status" />
            <p id="passagem-status" className="mt-1.5 flex items-center gap-1 text-xs" aria-live="polite">
              {brief.passagem?.trim() ? (passage
                ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> <span className="text-emerald-800">{passage.book.name} {passage.chapter}{passage.verses ? `,${passage.verses}` : ""} — referência válida</span></>
                : <><XCircle className="h-3.5 w-3.5 text-amber-700" /> <span className="text-amber-900">Não reconhecemos esta referência. Use o formato “Lc 15,11-32”.</span></>)
                : <span className="text-ink-mute">Formato brasileiro: livro capítulo,versículos.</span>}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-ivory-200 pt-5 md:col-span-2 md:flex-row md:items-center">
            {status?.ai !== false ? (
              <Button type="submit" disabled={loading || needsLogin} className="md:px-7"><Sparkles className="h-4 w-4 text-gold-300" /> {loading ? "Gerando…" : "Gerar roteiro com IA"}</Button>
            ) : (
              <Button type="submit" disabled={loading}><LayoutTemplate className="h-4 w-4" /> Gerar roteiro-base</Button>
            )}
            {status?.ai && <Button type="button" variant="ghost" disabled={loading} onClick={() => generate("modelo")}><LayoutTemplate className="h-4 w-4" /> Roteiro-base sem IA</Button>}
            <p className="text-xs text-ink-mute md:ml-auto md:max-w-xs">Isto não é uma homilia: na Santa Missa, a homilia é reservada ao sacerdote ou diácono (CIC cân. 767 §1).</p>
          </div>
        </form>

        {loading && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-royal-100 bg-royal-50/60 p-5 text-royal-900" role="status">
            <Loader2 className="h-5 w-5 animate-spin" />
            <div><p className="font-semibold">{STEPS[step]}</p><p className="text-sm text-royal-700">Isto pode levar até um minuto.</p></div>
          </div>
        )}
        {error && (
          <div className="mt-6"><Notice tone="warn" title="Não foi possível gerar agora">
            {error.msg}{" "}
            {error.code === "login" && <Link href="/entrar?voltar=/assistente" className="font-semibold underline">Entrar</Link>}
            {(error.code === "limite-plano" || error.code === "limite" || error.code === "api" || error.code === "conexao") && <button className="font-semibold underline" onClick={() => generate("modelo")}>Gerar roteiro-base sem IA</button>}
          </Notice></div>
        )}
      </div>

      {outline && (
        <div className="mt-10">
          <div className="sticky top-16 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 bg-ivory-100/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:border-ivory-300/70 sm:px-3 print:hidden">
            <Button onClick={save} className="py-2"><Save className="h-4 w-4" /> {projectId ? "Salvar alterações" : "Salvar"}</Button>
            <Button variant="ghost" onClick={copy} className="py-2"><Copy className="h-4 w-4" /> Copiar</Button>
            <Button variant="ghost" onClick={() => window.print()} className="py-2"><FileDown className="h-4 w-4" /> Exportar PDF</Button>
            <Button variant="ghost" onClick={reset} className="py-2"><RotateCcw className="h-4 w-4" /> Nova</Button>
            {dirty && <span className="ml-auto text-xs text-ink-mute">Alterações não salvas</span>}
          </div>
          <OutlineEditor outline={outline} onChange={(o) => { setOutline(o); setDirty(true); }} />
        </div>
      )}
    </div>
  );
}
