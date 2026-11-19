"use client";
import { useState } from "react";
import { api, usePoll, fmtDate } from "@/lib/api";
import { Card, PageHeader, StateBadge, Table, Td, Loading, ErrorBox, Button, Stat } from "./ui";

const RUN: Record<string, { path: string; label: string } | undefined> = {
  SCOUT: { path: "agents/scout/run", label: "Pesquisar agora" },
  COPYWRITER: { path: "agents/copywriter/run", label: "Processar aprovados" },
  DISTRIBUTOR: { path: "agents/distributor/tick", label: "Verificar publicação agora" },
};

export function AgentDetail({ kind, description }: { kind: string; description: string }) {
  const { data, error, loading, reload } = usePoll<any>(`agents/${kind}/executions`, 4000);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (loading && !data) return <Loading />;
  if (!data) return <ErrorBox error={error} />;
  const a = data.agent;
  const items: any[] = data.items;
  const ok = items.filter((i) => i.status === "SUCCESS").length;
  const failed = items.filter((i) => i.status === "FAILED").length;
  const avg = items.filter((i) => i.durationMs).reduce((s, i, _, arr) => s + i.durationMs / arr.length, 0);
  const run = RUN[kind];

  async function trigger() {
    if (!run) return;
    setBusy(true);
    try {
      const r = await api(run.path, { method: "POST" });
      setMsg(r.message ?? (r.enqueued !== undefined ? `${r.enqueued} produtos enviados ao Copywriter` : "Solicitado"));
      setTimeout(reload, 1500);
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title={a.name} subtitle={description} actions={<><StateBadge state={a.status} />{run && <Button variant="primary" loading={busy} onClick={trigger}>{run.label}</Button>}</>} />
      <ErrorBox error={error} />
      {msg && <p className="mb-4 text-sm text-electric-400">{msg}</p>}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Execuções (últimas 100)" value={items.length} />
        <Stat label="Sucesso" value={ok} tone="green" />
        <Stat label="Falhas" value={failed} tone={failed ? "red" : "default"} />
        <Stat label="Duração média" value={`${(avg / 1000).toFixed(1)}s`} />
      </div>
      <div className="mb-4 grid gap-4 md:grid-cols-2">
        <Card title="Identidade"><p className="text-sm text-zinc-300">{a.identity}</p>{a.lastError && <p className="mt-3 text-xs text-red-400">Último erro: {a.lastError}</p>}</Card>
        <Card title="Prompt do agente"><pre className="max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-400">{a.systemPrompt}</pre></Card>
      </div>
      <Card title="Registro de execuções">
        <Table head={["Início", "Tarefa", "Status", "Modelo", "Duração", "Resultado"]} empty={!items.length}>
          {items.map((e) => (
            <tr key={e.id}>
              <Td className="whitespace-nowrap text-zinc-500">{fmtDate(e.startedAt)}</Td>
              <Td>{e.task}</Td>
              <Td><StateBadge state={e.status} /></Td>
              <Td className="font-mono text-[11px]">{e.model ?? "—"}</Td>
              <Td className="tabular-nums">{e.durationMs ? `${(e.durationMs / 1000).toFixed(1)}s` : "—"}</Td>
              <Td className="max-w-md"><span className="line-clamp-2 font-mono text-[11px] text-zinc-500">{e.error ?? (e.output ? JSON.stringify(e.output).slice(0, 220) : "—")}</span></Td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
