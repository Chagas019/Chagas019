"use client";
import { useState } from "react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { api, usePoll, brl } from "@/lib/api";
import { Card, PageHeader, Stat, Loading, ErrorBox, Select, Button, Table, Td } from "@/components/ui";

const tip = { contentStyle: { background: "#13161a", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, fontSize: 12 } };

export default function Analytics() {
  const [days, setDays] = useState(30);
  const { data, error, reload } = usePoll<any>(`analytics?days=${days}`, 30000);
  const [sync, setSync] = useState<string | null>(null);
  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const cats = Object.entries(data.byCategory).map(([name, v]: any) => ({ name, Pesquisados: v.researched, Publicados: v.published, nota: v.avgScore ? Math.round(v.avgScore) : null, est: v.estCommission })).sort((a, b) => b.Publicados - a.Publicados || b.Pesquisados - a.Pesquisados);

  async function syncCommissions() {
    try { const r = await api("analytics/sync-commissions", { method: "POST" }); setSync(`${r.conversions} conversões importadas do relatório oficial`); reload(); } catch (e) { setSync((e as Error).message); }
  }

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Analytics" subtitle="Cliques ≠ vendas. Conversões e comissão reportada só aparecem com dados oficiais da Shopee."
        actions={<><Select value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 14, 30, 90].map((d) => <option key={d} value={d}>{d} dias</option>)}</Select><Button onClick={syncCommissions}>Sincronizar comissões (Shopee)</Button></>} />
      {sync && <p className="mb-4 text-sm text-electric-400">{sync}</p>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Publicações reais" value={data.totals.published} tone="green" />
        <Stat label="Simulações (teste)" value={data.totals.dryRun} />
        <Stat label="Cliques" value={data.clickTracking ? data.totals.clicks : "—"} hint={data.clickTracking ? "redirecionador próprio" : "configure PUBLIC_BASE_URL"} tone="blue" />
        <Stat label="Comissão estimada" value={brl(data.totals.estimatedCommission)} hint="preço × taxa, sem venda confirmada" />
        <Stat label="Comissão reportada" value={data.totals.reportedCommission === null ? "sem dados" : brl(data.totals.reportedCommission)} hint="relatório oficial de conversões" tone="green" />
      </div>
      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card title="Evolução diária">
          <div className="h-64"><ResponsiveContainer><LineChart data={data.daily.map((d: any) => ({ d: d.date.slice(5), Pesquisados: d.researched, Aprovados: d.approved, Publicados: d.published + d.dryRunPublished }))}>
            <XAxis dataKey="d" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} /><YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={30} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
            <Line dataKey="Pesquisados" stroke="#71717a" dot={false} strokeWidth={1.5} /><Line dataKey="Aprovados" stroke="#3b82f6" dot={false} strokeWidth={2} /><Line dataKey="Publicados" stroke="#22c55e" dot={false} strokeWidth={2} />
          </LineChart></ResponsiveContainer></div>
        </Card>
        <Card title="Categorias">
          <div className="h-64"><ResponsiveContainer><BarChart data={cats.slice(0, 10)} layout="vertical" margin={{ left: 40 }}>
            <XAxis type="number" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} /><YAxis type="category" dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} width={110} /><Tooltip {...tip} />
            <Bar dataKey="Pesquisados" fill="#2e333b" radius={[0, 4, 4, 0]} /><Bar dataKey="Publicados" fill="#3b82f6" radius={[0, 4, 4, 0]} />
          </BarChart></ResponsiveContainer></div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Mais pesquisados"><ol className="space-y-1.5 text-[13px]">{data.mostResearched.map((m: any, i: number) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-zinc-300">{m.name}</span><span className="tabular-nums text-zinc-500">{m.count}×</span></li>)}</ol></Card>
        <Card title="Mais publicados"><ol className="space-y-1.5 text-[13px]">{data.mostPublished.length ? data.mostPublished.map((m: any, i: number) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-zinc-300">{m.name}</span><span className="tabular-nums text-zinc-500">{m.count}×</span></li>) : <li className="text-zinc-500">Sem publicações.</li>}</ol></Card>
        <Card title="Mais clicados">{!data.clickTracking ? <p className="text-sm text-zinc-500">Rastreamento de cliques desativado. Defina PUBLIC_BASE_URL para usar o redirecionador próprio.</p> : <ol className="space-y-1.5 text-[13px]">{data.topClicked.map((m: any, i: number) => <li key={i} className="flex justify-between gap-2"><span className="truncate text-zinc-300">{m.name}</span><span className="tabular-nums text-zinc-500">{m.clicks}</span></li>)}</ol>}</Card>
      </div>
      <Card title="Desempenho por categoria" className="mt-4">
        <Table head={["Categoria", "Pesquisados", "Publicados", "Nota média", "Comissão estimada"]} empty={!cats.length}>
          {cats.map((c) => <tr key={c.name}><Td>{c.name}</Td><Td className="tabular-nums">{c.Pesquisados}</Td><Td className="tabular-nums">{c.Publicados}</Td><Td className="tabular-nums">{c.nota ?? "—"}</Td><Td className="tabular-nums">{brl(c.est)}</Td></tr>)}
        </Table>
      </Card>
      <Card title="Desempenho dos agentes" className="mt-4">
        <div className="grid gap-3 md:grid-cols-4">
          {data.agents.map((a: any) => (
            <div key={a.kind} className="rounded-lg bg-ink-850 p-3"><p className="mb-2 text-sm text-white">{a.name}</p>
              {a.stats.length ? a.stats.map((s: any) => <p key={s.status} className="text-xs text-zinc-400">{s.status}: {s.count} · média {(s.avgMs / 1000).toFixed(1)}s</p>) : <p className="text-xs text-zinc-500">sem execuções</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
