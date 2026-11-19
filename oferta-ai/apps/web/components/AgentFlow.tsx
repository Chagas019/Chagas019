"use client";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Radar, PenLine, Send, Workflow, ChevronRight } from "lucide-react";
import { StateBadge } from "./ui";
import { fmtDate } from "@/lib/api";

const ICON: Record<string, any> = { SCOUT: Radar, COPYWRITER: PenLine, DISTRIBUTOR: Send, ORCHESTRATOR: Workflow };
const ORDER = ["SCOUT", "COPYWRITER", "DISTRIBUTOR"];

/** Visualização em tempo real do fluxo Scout → Copywriter → Distributor. */
export function AgentFlow({ agents, states }: { agents: any[]; states?: Record<string, number> }) {
  const byKind = Object.fromEntries(agents.map((a) => [a.kind, a]));
  const orch = byKind.ORCHESTRATOR;
  const counts = states ?? {};
  const stageCount = {
    SCOUT: (counts.RESEARCHING ?? 0) + (counts.APPROVED ?? 0),
    COPYWRITER: (counts.COPY_GENERATED ?? 0) + (counts.READY_TO_PUBLISH ?? 0),
    DISTRIBUTOR: (counts.PUBLISHING ?? 0) + (counts.PUBLISHED ?? 0),
  } as Record<string, number>;
  const stageLabel = { SCOUT: "em pesquisa / aprovados", COPYWRITER: "copy pronta / na fila", DISTRIBUTOR: "publicando / publicados" } as Record<string, string>;

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
        {ORDER.map((k, i) => {
          const a = byKind[k];
          if (!a) return null;
          const Icon = ICON[k];
          const running = a.status === "RUNNING";
          return (
            <div key={k} className="contents">
              <motion.div layout className={clsx("relative overflow-hidden rounded-xl bg-ink-850 p-4 ring-1 transition", running ? "ring-electric-500/60 shadow-glow" : a.status === "ERROR" || a.status === "STOPPED" ? "ring-red-500/30" : "ring-white/[0.06]")}>
                {running && <motion.div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-electric-400 to-transparent" animate={{ x: ["-100%", "100%"] }} transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }} />}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx("flex h-8 w-8 items-center justify-center rounded-lg", running ? "bg-electric-500/20 text-electric-400" : "bg-white/5 text-zinc-400")}><Icon className="h-4 w-4" /></div>
                    <div>
                      <p className="text-sm font-medium text-white">{a.name}</p>
                      <p className="text-[11px] text-zinc-500">Último: {fmtDate(a.lastRunAt)}</p>
                    </div>
                  </div>
                  <StateBadge state={a.status} />
                </div>
                <p className="mt-3 line-clamp-2 min-h-[2.5em] text-xs text-zinc-400">{a.currentTask ?? a.lastError ?? a.identity}</p>
                <div className="mt-3 flex items-baseline gap-1.5 border-t border-white/[0.05] pt-3">
                  <span className="text-xl font-semibold tabular-nums text-white">{stageCount[k] ?? 0}</span>
                  <span className="text-[11px] text-zinc-500">{stageLabel[k]}</span>
                </div>
              </motion.div>
              {i < ORDER.length - 1 && (
                <div className="hidden items-center justify-center md:flex">
                  <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}><ChevronRight className="h-5 w-5 text-electric-500/70" /></motion.div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {orch && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-ink-850/60 px-4 py-2.5 ring-1 ring-white/[0.05]">
          <div className="flex items-center gap-2 text-xs text-zinc-400"><Workflow className="h-3.5 w-3.5 text-electric-400" /> Orchestrator · Scout → Validação → Copywriter → Validação final → Distributor</div>
          <StateBadge state={orch.status} />
        </div>
      )}
    </div>
  );
}
