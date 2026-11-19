"use client";
import { use, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, usePoll, brl, fmtDate, fmtNum } from "@/lib/api";
import { Card, PageHeader, StateBadge, Loading, ErrorBox, Button, Badge } from "@/components/ui";

const CRIT: Record<string, string> = { price: "Competitividade do preço", rating: "Avaliações", sales: "Vendas", store: "Reputação da loja", discount: "Desconto comprovado", commission: "Comissão" };

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: p, error, reload } = usePoll<any>(`products/${id}`, 6000);
  const [busy, setBusy] = useState("");
  if (!p) return error ? <ErrorBox error={error} /> : <Loading />;
  const sb = p.scoreBreakdown;

  async function act(path: string, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(path);
    try { await api(`products/${id}/${path}`, { method: "POST" }); await reload(); } catch (e) { alert((e as Error).message); } finally { setBusy(""); }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={p.name} subtitle={`${p.category} · ${p.shopName ?? "loja não informada"} · ID ${p.externalId}`}
        actions={<>
          <StateBadge state={p.state} />
          {p.source === "SANDBOX" && <Badge tone="amber">produto fictício (teste)</Badge>}
          {["READY_TO_PUBLISH", "COPY_GENERATED"].includes(p.state) && <Button loading={busy === "regenerate-copy"} onClick={() => act("regenerate-copy")}>Regerar copy</Button>}
          {p.state === "FAILED" && <Button loading={busy === "retry"} onClick={() => act("retry")}>Reprocessar</Button>}
          {!["REJECTED", "PUBLISHED", "PUBLISHING"].includes(p.state) && <Button variant="danger" loading={busy === "reject"} onClick={() => act("reject", "Rejeitar este produto?")}>Rejeitar</Button>}
        </>} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[["Preço atual", brl(p.currentPrice)], ["Preço original", p.originalPrice ? `${brl(p.originalPrice)} (${p.discountSource === "history" ? "histórico" : "Shopee"})` : "não comprovado"], ["Avaliação", p.rating ?? "indisponível"], ["Vendas", p.sales !== null ? fmtNum(p.sales) : "indisponível"], ["Comissão", p.commissionRate !== null ? `${(p.commissionRate * 100).toFixed(1)}% · ${brl(p.commissionValue)}` : "indisponível"]].map(([l, v]) => (
          <Card key={l as string}><p className="text-[11px] uppercase tracking-wider text-zinc-500">{l}</p><p className="mt-1.5 text-sm font-medium text-white">{v}</p></Card>
        ))}
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title={`Pontuação ${p.score ?? "—"}/100`}>
          {sb ? Object.keys(CRIT).map((k) => (
            <div key={k} className="mb-3">
              <div className="mb-1 flex justify-between text-xs"><span className="text-zinc-300">{CRIT[k]}</span><span className="tabular-nums text-zinc-400">{sb[k].points}/{sb[k].max}</span></div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-electric-500" style={{ width: `${(sb[k].points / sb[k].max) * 100}%` }} /></div>
              <p className="mt-0.5 text-[11px] text-zinc-500">{sb[k].available ? sb[k].basis : `indisponível — ${sb[k].basis}`}</p>
            </div>
          )) : <p className="text-sm text-zinc-500">{p.rejectionReason ?? "Sem pontuação."}</p>}
          {p.unavailableData?.length > 0 && <p className="mt-2 text-[11px] text-amber-300/80">Dados não fornecidos pela API: {p.unavailableData.join(", ")}</p>}
        </Card>
        <Card title="Histórico de preços">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={p.prices.map((x: any) => ({ t: fmtDate(x.capturedAt), Preço: Number(x.price) }))}>
                <XAxis dataKey="t" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} width={50} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "#13161a", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="Preço" stroke="#3b82f6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Copies geradas">
          {p.copies.length === 0 && <p className="text-sm text-zinc-500">Nenhuma copy.</p>}
          {p.copies.map((c: any) => (
            <div key={c.id} className="mb-4 rounded-lg bg-ink-850 p-4 ring-1 ring-white/[0.05]">
              <div className="mb-2 flex items-center gap-2"><Badge tone={c.valid ? "green" : "red"}>{c.valid ? "válida" : "inválida"}</Badge><span className="font-mono text-[11px] text-zinc-500">{c.model} · {fmtDate(c.createdAt)}</span></div>
              <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-zinc-200">{c.message}</pre>
              {c.validationErrors.length > 0 && <p className="mt-2 text-xs text-red-400">{c.validationErrors.join("; ")}</p>}
            </div>
          ))}
        </Card>
        <Card title="Linha do tempo (estados)">
          <ol className="relative border-l border-white/10 pl-4">
            {p.stateHistory.map((h: any) => (
              <li key={h.id} className="mb-3">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-electric-500" />
                <div className="flex items-center gap-2"><StateBadge state={h.toState} /><span className="text-[11px] text-zinc-500">{fmtDate(h.createdAt)} · {h.actor}</span></div>
                {h.reason && <p className="mt-0.5 text-xs text-zinc-400">{h.reason}</p>}
              </li>
            ))}
          </ol>
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="mb-2 text-xs font-medium text-zinc-300">Links de afiliado</p>
            {p.affiliateLinks.map((l: any) => <p key={l.id} className="break-all font-mono text-[11px] text-zinc-400">{l.url} · {l.origin} · {l.clicks} cliques</p>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
