"use client";
import { useState } from "react";
import { usePoll, fmtDate } from "@/lib/api";
import { Card, PageHeader, Loading, ErrorBox, Select, Badge } from "@/components/ui";

export default function Logs() {
  const [level, setLevel] = useState("");
  const [source, setSource] = useState("");
  const qs = new URLSearchParams({ ...(level ? { level } : {}), ...(source ? { source } : {}) });
  const { data, error } = usePoll<any>(`logs?${qs}`, 4000);
  const tone = (l: string) => (l === "error" ? "red" : l === "warn" ? "amber" : "zinc") as any;
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Logs do sistema" subtitle="Logs estruturados de agentes, orquestrador, circuit breaker e integrações."
        actions={<><Select value={level} onChange={(e) => setLevel(e.target.value)}><option value="">Todos os níveis</option><option value="info">info</option><option value="warn">warn</option><option value="error">error</option></Select>
          <Select value={source} onChange={(e) => setSource(e.target.value)}><option value="">Todas as fontes</option>{data?.sources?.map((s: string) => <option key={s}>{s}</option>)}</Select></>} />
      <ErrorBox error={error} />
      <Card>
        {!data ? <Loading /> : (
          <div className="-mx-5 divide-y divide-white/[0.04] font-mono text-[12px]">
            {data.items.length === 0 && <p className="px-5 py-8 text-center font-sans text-sm text-zinc-500">Sem logs.</p>}
            {data.items.map((l: any) => (
              <div key={l.id} className="flex flex-col gap-1 px-5 py-2 sm:flex-row sm:items-start sm:gap-3">
                <span className="shrink-0 text-zinc-600">{fmtDate(l.createdAt)}</span>
                <span className="w-14 shrink-0"><Badge tone={tone(l.level)}>{l.level}</Badge></span>
                <span className="w-28 shrink-0 text-electric-400">{l.source}</span>
                <span className="break-all text-zinc-300">{l.message}{l.meta ? <span className="text-zinc-600"> {JSON.stringify(l.meta)}</span> : null}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
