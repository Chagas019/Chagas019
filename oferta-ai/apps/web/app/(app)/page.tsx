"use client";
import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { usePoll, brl, fmtDate } from "@/lib/api";
import { Card, Stat, PageHeader, Progress, Loading, ErrorBox, StateBadge, Badge } from "@/components/ui";
import { AgentFlow } from "@/components/AgentFlow";

export default function Dashboard() {
  const { data, error, loading } = usePoll<any>("dashboard", 4000);
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox error={error} />;
  const t = data.today;
  const c = data.control;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Dashboard"
        subtitle={`Hoje · janela ${c.window} · 1 oferta a cada ${c.intervalMinutes} min · canal: ${data.channel === "dry_run" ? "simulação (teste)" : data.channel}`}
        actions={<>
          <Badge tone={c.autoPublish ? "green" : "zinc"}>Publicação automática {c.autoPublish ? "ligada" : "desligada"}</Badge>
          <Badge tone={c.circuitFailures > 0 ? "amber" : "zinc"}>Circuit breaker {c.circuitFailures}/{c.circuitThreshold}</Badge>
        </>}
      />
      <ErrorBox error={error} />
      {c.publishingPaused && <div className="mb-4 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-200 ring-1 ring-amber-500/20">Publicação pausada: {c.publishingPausedReason}. <Link className="underline" href="/settings">Reiniciar em Configurações</Link></div>}

      <Card className="mb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Ofertas publicadas hoje</p>
            <p className="mt-2 text-5xl font-semibold tabular-nums tracking-tight text-white">{t.publishedTotal}<span className="text-2xl text-zinc-600"> / {t.goal}</span></p>
            <p className="mt-1 text-xs text-zinc-500">{t.published} reais · {t.dryRunPublished} simuladas (teste){t.goalNote ? ` · ${t.goalNote}` : ""}</p>
          </div>
          <div className="w-full sm:w-80">
            <div className="mb-2 flex justify-between text-xs text-zinc-400"><span>Meta diária</span><span className="tabular-nums">{t.publishRate}%</span></div>
            <Progress value={t.publishedTotal} max={t.goal} />
          </div>
        </div>
      </Card>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Pesquisados" value={t.researched} delay={0.02} />
        <Stat label="Aprovados" value={t.approved} tone="blue" delay={0.04} />
        <Stat label="Rejeitados" value={t.rejected} delay={0.06} />
        <Stat label="Copies geradas" value={t.copiesGenerated} delay={0.08} />
        <Stat label="Taxa de publicação" value={`${t.publishRate}%`} tone="green" hint="publicadas / meta" delay={0.1} />
        <Stat label="Comissão estimada" value={brl(t.estimatedCommission)} hint="estimativa, não é venda" delay={0.12} />
      </div>

      <Card title="Status dos agentes" className="mb-4" action={<Link href="/agents" className="text-xs text-electric-400 hover:underline">Ver em tempo real</Link>}>
        <AgentFlow agents={data.agents} states={data.states} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Últimos 14 dias" className="lg:col-span-3">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={data.series.map((d: any) => ({ date: d.date.slice(5), Publicadas: d.published + d.dryRunPublished, Aprovadas: d.approved }))}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={11} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={{ background: "#13161a", border: "1px solid rgba(255,255,255,.08)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="Aprovadas" stroke="#3b82f6" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="Publicadas" stroke="#22c55e" fill="url(#g2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Publicações recentes" className="lg:col-span-2" action={<Link href="/publications" className="text-xs text-electric-400 hover:underline">Central</Link>}>
          <ul className="space-y-3">
            {data.recentPublications.length === 0 && <li className="text-sm text-zinc-500">Nenhuma publicação hoje.</li>}
            {data.recentPublications.map((p: any) => (
              <li key={p.id} className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-zinc-200">{p.product.name}</p>
                  <p className="text-[11px] text-zinc-500">{brl(p.product.currentPrice)} · nota {p.product.score ?? "—"} · {fmtDate(p.sentAt ?? p.createdAt)}</p>
                </div>
                <StateBadge state={p.status} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
