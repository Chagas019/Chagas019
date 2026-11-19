"use client";
import { useEffect, useState } from "react";
import { api, usePoll } from "@/lib/api";
import { Card, PageHeader, Loading, ErrorBox, Button, Input, Select, Badge } from "@/components/ui";

function Field({ label, hint, children }: any) {
  return (<label className="block"><span className="mb-1.5 block text-xs text-zinc-400">{label}</span>{children}{hint && <span className="mt-1 block text-[11px] text-zinc-600">{hint}</span>}</label>);
}

export default function SettingsPage() {
  const { data, error, reload } = usePoll<any>("settings", 0);
  const [s, setS] = useState<any>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { if (data) setS(data.settings); }, [data]);
  if (!data || !s) return error ? <ErrorBox error={error} /> : <Loading />;

  const set = (k: string, v: any) => setS({ ...s, [k]: v });
  const num = (k: string) => ({ type: "number", value: s[k], onChange: (e: any) => set(k, Number(e.target.value)) });

  async function save() {
    setBusy("save"); setMsg(null);
    try {
      const { autoPublish, systemHalted, publishingPaused, publishingPausedReason, ...patch } = s;
      await api("settings", { method: "PUT", body: patch });
      setMsg("Configurações salvas e agendas atualizadas.");
      reload();
    } catch (e: any) { setMsg(`Erro: ${e.message}`); } finally { setBusy(""); }
  }
  async function toggleAuto() {
    setBusy("auto"); setMsg(null);
    try { await api("settings/auto-publish", { method: "POST", body: { enabled: !s.autoPublish } }); reload(); }
    catch (e: any) { setMsg(`${e.message}${e.body?.reasons ? ": " + e.body.reasons.join("; ") : ""}`); } finally { setBusy(""); }
  }
  async function post(path: string, label: string) {
    setBusy(path);
    try { await api(path, { method: "POST" }); setMsg(label); reload(); } catch (e: any) { setMsg(e.message); } finally { setBusy(""); }
  }
  const toggleCat = (c: string) => set("enabledCategories", s.enabledCategories.includes(c) ? s.enabledCategories.filter((x: string) => x !== c) : [...s.enabledCategories, c]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Configurações" subtitle={`Fuso ${data.timezone} · moeda BRL · modo ${data.mode}`} actions={<Button variant="primary" loading={busy === "save"} onClick={save}>Salvar</Button>} />
      {msg && <p className="mb-4 rounded-lg bg-white/5 px-4 py-2.5 text-sm text-zinc-200">{msg}</p>}

      <Card title="Publicação automática" className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-zinc-200">Status: <Badge tone={s.autoPublish ? "green" : "zinc"}>{s.autoPublish ? "habilitada" : "desabilitada"}</Badge></p>
            <p className="mt-1 text-xs text-zinc-500">Só pode ser habilitada após validar credenciais, permissões, consentimento e conectividade do canal e da Shopee.</p>
          </div>
          <Button variant={s.autoPublish ? "danger" : "primary"} loading={busy === "auto"} onClick={toggleAuto}>{s.autoPublish ? "Desabilitar" : "Habilitar"}</Button>
        </div>
        {s.publishingPaused && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-amber-500/20 sm:flex-row sm:items-center sm:justify-between">
            <span>{s.publishingPausedReason}</span>
            <Button loading={busy === "system/circuit-breaker/reset"} onClick={() => post("system/circuit-breaker/reset", "Circuit breaker reiniciado.")}>Reiniciar publicação</Button>
          </div>
        )}
        {!s.publishingPaused && <Button className="mt-4" variant="ghost" onClick={() => post("system/pause-publishing", "Publicação pausada.")}>Pausar publicação</Button>}
      </Card>

      <Card title="Meta e agenda" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Meta diária"><Input {...num("dailyGoal")} /></Field>
          <Field label="Limite diário"><Input {...num("dailyLimit")} /></Field>
          <Field label="Pontuação mínima"><Input {...num("minScore")} /></Field>
          <Field label="Início da janela"><Input type="time" value={s.publishWindowStart} onChange={(e) => set("publishWindowStart", e.target.value)} /></Field>
          <Field label="Fim da janela"><Input type="time" value={s.publishWindowEnd} onChange={(e) => set("publishWindowEnd", e.target.value)} /></Field>
          <Field label="Intervalo mínimo (min)" hint="efetivo = máx(mínimo, janela ÷ meta)"><Input {...num("minIntervalMinutes")} /></Field>
          <Field label="Pesquisa periódica (min)"><Input {...num("researchIntervalMinutes")} /></Field>
          <Field label="Canal principal">
            <Select value={s.primaryChannel} onChange={(e) => set("primaryChannel", e.target.value)} className="w-full">
              <option value="manual">Compartilhamento manual (WhatsApp)</option>
              <option value="whatsapp_cloud">WhatsApp Cloud API (Groups API)</option>
              <option value="telegram">Telegram Bot API</option>
            </Select>
          </Field>
          <Field label="Máx. por categoria/dia"><Input {...num("maxPerCategoryPerDay")} /></Field>
        </div>
      </Card>

      <Card title="Qualidade e segurança" className="mb-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Deduplicação (dias)"><Input {...num("dedupDays")} /></Field>
          <Field label="Variação máx. de preço (%)" hint="revalidação antes de publicar"><Input {...num("maxPriceDriftPct")} /></Field>
          <Field label="Reputação mínima da loja (0–15)"><Input {...num("minStoreScore")} /></Field>
          <Field label="Circuit breaker (falhas)"><Input {...num("circuitBreakerThreshold")} /></Field>
          <Field label="Retentativas"><Input {...num("maxRetries")} /></Field>
          <Field label="Palavras-chave por ciclo"><Input {...num("keywordsPerCycle")} /></Field>
          <Field label="Produtos por palavra-chave"><Input {...num("productsPerKeyword")} /></Field>
        </div>
      </Card>

      <Card title={`Categorias (${s.enabledCategories.length ? s.enabledCategories.length : "todas"} habilitadas)`}>
        <p className="mb-3 text-xs text-zinc-500">Nenhuma marcada = todas as categorias. A rotação alterna categorias para garantir variedade.</p>
        <div className="flex flex-wrap gap-2">
          {data.categories.map((c: string) => (
            <button key={c} onClick={() => toggleCat(c)} className={`rounded-lg px-3 py-1.5 text-[13px] ring-1 ring-inset transition ${s.enabledCategories.includes(c) ? "bg-electric-500/15 text-electric-400 ring-electric-500/40" : "bg-white/[0.03] text-zinc-400 ring-white/10 hover:text-zinc-200"}`}>{c}</button>
          ))}
        </div>
      </Card>
    </div>
  );
}
