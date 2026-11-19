"use client";
import { usePoll, fmtDate } from "@/lib/api";
import { Card, PageHeader, Loading, ErrorBox, StateBadge, Badge } from "@/components/ui";
import { AgentFlow } from "@/components/AgentFlow";

export default function AgentsLive() {
  const { data, error } = usePoll<any>("agents", 2000);
  const dash = usePoll<any>("dashboard", 4000);
  if (!data) return error ? <ErrorBox error={error} /> : <Loading />;
  const q = data.queues;
  const recent = data.agents.flatMap((a: any) => a.recent.map((r: any) => ({ ...r, agent: a.name }))).sort((a: any, b: any) => +new Date(b.startedAt) - +new Date(a.startedAt)).slice(0, 25);
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Agentes em tempo real" subtitle="Atualização a cada 2 segundos" actions={<Badge tone="blue" pulse>ao vivo</Badge>} />
      <Card className="mb-4"><AgentFlow agents={data.agents} states={dash.data?.states} /></Card>
      <div className="mb-4 grid gap-3 md:grid-cols-4">
        {data.agents.map((a: any) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between"><p className="text-sm font-medium text-white">{a.name}</p><StateBadge state={a.status} /></div>
            <p className="mt-2 text-xs text-zinc-500">24h: <span className="text-success-400">{a.last24h.success} ok</span> · <span className={a.last24h.failed ? "text-red-400" : ""}>{a.last24h.failed} falhas</span></p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Filas (BullMQ)">
          {(["orchestrator", "copywriter"] as const).map((k) => (
            <div key={k} className="mb-3">
              <p className="mb-1 text-xs font-medium capitalize text-zinc-300">{k} {q[`${k}Paused`] && <Badge tone="red">pausada</Badge>}</p>
              <div className="grid grid-cols-4 gap-2 text-center">
                {["active", "waiting", "delayed", "failed"].map((s) => (
                  <div key={s} className="rounded-lg bg-ink-850 py-2"><p className="text-lg font-semibold tabular-nums text-white">{q[k][s] ?? 0}</p><p className="text-[10px] uppercase text-zinc-500">{s}</p></div>
                ))}
              </div>
            </div>
          ))}
        </Card>
        <Card title="Atividade recente" className="lg:col-span-2">
          <ul className="divide-y divide-white/[0.04]">
            {recent.map((r: any) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0"><p className="truncate text-[13px] text-zinc-200"><span className="text-zinc-500">{r.agent}</span> · {r.task}</p><p className="truncate font-mono text-[11px] text-zinc-600">{r.error ?? ""}</p></div>
                <div className="flex shrink-0 items-center gap-2"><span className="text-[11px] text-zinc-500">{fmtDate(r.startedAt)}</span><StateBadge state={r.status} /></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
