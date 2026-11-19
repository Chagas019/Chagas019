"use client";
import Link from "next/link";
import { useState } from "react";
import { api, usePoll, brl, fmtDate } from "@/lib/api";
import { Card, PageHeader, StateBadge, Loading, ErrorBox, Button, Select, Badge } from "@/components/ui";

export default function Publications() {
  const [status, setStatus] = useState("");
  const { data, error, reload } = usePoll<any>(`publications${status ? `?status=${status}` : ""}`, 4000);
  const [copied, setCopied] = useState<string | null>(null);
  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const manual = data.items.filter((p: any) => p.status === "MANUAL_PENDING");

  async function act(id: string, action: "confirm" | "cancel") {
    try { await api(`publications/${id}/${action}`, { method: "POST" }); await reload(); } catch (e) { alert((e as Error).message); }
  }
  async function copy(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Central de publicações" subtitle="Fila priorizada, envios, status e retentativas."
        actions={<Select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos os status</option>{["QUEUED", "SENDING", "SENT", "DRY_RUN", "MANUAL_PENDING", "MANUAL_CONFIRMED", "FAILED", "CANCELLED"].map((s) => <option key={s}>{s}</option>)}</Select>} />
      <ErrorBox error={error} />

      {manual.length > 0 && (
        <Card title={`Envio manual pendente (${manual.length})`} className="mb-4">
          <p className="mb-4 text-xs text-zinc-400">Modo compartilhamento manual: copie a mensagem (ou toque em “Abrir no WhatsApp”), escolha o grupo autorizado e envie. Depois confirme aqui para registrar.</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {manual.map((p: any) => (
              <div key={p.id} className="rounded-lg bg-ink-850 p-4 ring-1 ring-amber-500/20">
                <pre className="mb-3 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-[13px] text-zinc-200">{p.copy.message}</pre>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => copy(p.id, p.copy.message)}>{copied === p.id ? "Copiado ✓" : "Copiar mensagem"}</Button>
                  <a className="inline-flex h-8 items-center rounded-lg bg-success/90 px-3 text-[13px] font-medium text-ink-950 hover:bg-success" href={`https://wa.me/?text=${encodeURIComponent(p.copy.message)}`} target="_blank" rel="noreferrer">Abrir no WhatsApp</a>
                  <Button variant="primary" onClick={() => act(p.id, "confirm")}>Confirmar envio</Button>
                  <Button variant="ghost" onClick={() => act(p.id, "cancel")}>Devolver à fila</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title={`Fila de publicação (${data.queue.length})`} className="lg:col-span-2">
          <ol className="space-y-2">
            {data.queue.length === 0 && <li className="text-sm text-zinc-500">Nenhuma oferta pronta.</li>}
            {data.queue.map((p: any, i: number) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg bg-ink-850 px-3 py-2">
                <span className="w-5 text-center text-xs tabular-nums text-zinc-500">{i + 1}</span>
                <div className="min-w-0 flex-1"><Link href={`/products/${p.id}`} className="block truncate text-[13px] text-zinc-200 hover:text-electric-400">{p.name}</Link><p className="text-[11px] text-zinc-500">{p.category} · {brl(p.currentPrice)}</p></div>
                <Badge tone="blue">{p.score}</Badge>
              </li>
            ))}
          </ol>
        </Card>
        <Card title={`Publicações (${data.total})`} className="lg:col-span-3">
          <ul className="divide-y divide-white/[0.04]">
            {data.items.length === 0 && <li className="py-6 text-center text-sm text-zinc-500">Nenhuma publicação.</li>}
            {data.items.map((p: any) => (
              <li key={p.id} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/products/${p.product.id}`} className="block truncate text-[13px] text-zinc-100 hover:text-electric-400">{p.product.name}</Link>
                    <p className="text-[11px] text-zinc-500">{p.channel === "dry_run" ? "simulação (teste)" : p.channel} · tentativas {p.attempts} · {fmtDate(p.sentAt ?? p.createdAt)}{p.externalId ? ` · id ${p.externalId}` : ""}</p>
                    {p.error && <p className="mt-0.5 text-[11px] text-red-400">{p.error}</p>}
                  </div>
                  <StateBadge state={p.status} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
