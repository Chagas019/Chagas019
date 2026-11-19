"use client";
import { useState } from "react";
import { usePoll, fmtDate } from "@/lib/api";
import { Card, PageHeader, Table, Td, StateBadge, Loading, ErrorBox, Button } from "@/components/ui";

export default function HistoryPage() {
  const [type, setType] = useState<"states" | "executions" | "audit">("states");
  const [page, setPage] = useState(1);
  const { data, error } = usePoll<any>(`history?type=${type}&page=${page}`, 10000);
  const tabs = [["states", "Decisões / estados"], ["executions", "Execuções dos agentes"], ["audit", "Auditoria"]] as const;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Histórico" subtitle="Pesquisas, decisões dos agentes, publicações e auditoria administrativa." />
      <div className="mb-4 flex gap-1 rounded-lg bg-ink-900 p-1 shadow-card sm:w-fit">
        {tabs.map(([k, l]) => <button key={k} onClick={() => { setType(k); setPage(1); }} className={`rounded-md px-3 py-1.5 text-[13px] ${type === k ? "bg-white/10 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>{l}</button>)}
      </div>
      <ErrorBox error={error} />
      <Card>
        {!data ? <Loading /> : type === "states" ? (
          <Table head={["Quando", "Produto", "De", "Para", "Ator", "Motivo"]} empty={!data.items.length}>
            {data.items.map((h: any) => <tr key={h.id}><Td className="whitespace-nowrap text-zinc-500">{fmtDate(h.createdAt)}</Td><Td className="max-w-xs truncate">{h.product?.name}</Td><Td>{h.fromState ? <StateBadge state={h.fromState} /> : "—"}</Td><Td><StateBadge state={h.toState} /></Td><Td>{h.actor}</Td><Td className="max-w-sm text-xs text-zinc-400">{h.reason}</Td></tr>)}
          </Table>
        ) : type === "executions" ? (
          <Table head={["Início", "Agente", "Tarefa", "Status", "Duração", "Erro"]} empty={!data.items.length}>
            {data.items.map((e: any) => <tr key={e.id}><Td className="whitespace-nowrap text-zinc-500">{fmtDate(e.startedAt)}</Td><Td>{e.agent.name}</Td><Td>{e.task}</Td><Td><StateBadge state={e.status} /></Td><Td>{e.durationMs ? `${(e.durationMs / 1000).toFixed(1)}s` : "—"}</Td><Td className="max-w-sm text-xs text-red-400">{e.error}</Td></tr>)}
          </Table>
        ) : (
          <Table head={["Quando", "Usuário", "Ação", "Alvo", "IP"]} empty={!data.items?.length}>
            {data.items?.map((a: any) => <tr key={a.id}><Td className="whitespace-nowrap text-zinc-500">{fmtDate(a.createdAt)}</Td><Td>{a.user?.email ?? "sistema"}</Td><Td className="font-mono text-xs">{a.action}</Td><Td className="font-mono text-xs">{a.target}</Td><Td className="text-xs text-zinc-500">{a.ip}</Td></tr>)}
          </Table>
        )}
        <div className="mt-4 flex justify-end gap-2"><Button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button disabled={!data || data.items?.length < 50} onClick={() => setPage(page + 1)}>Próxima</Button></div>
      </Card>
    </div>
  );
}
