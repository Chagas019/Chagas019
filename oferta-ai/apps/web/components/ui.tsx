"use client";
import { motion } from "framer-motion";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { ReactNode, ButtonHTMLAttributes } from "react";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className, title, action, delay = 0 }: { children: ReactNode; className?: string; title?: string; action?: ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: [0.22, 1, 0.36, 1] }}
      className={clsx("rounded-xl bg-ink-900 shadow-card", className)}
    >
      {title && (
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3.5">
          <h2 className="text-[13px] font-medium text-zinc-300">{title}</h2>
          {action}
        </header>
      )}
      <div className={clsx(title ? "p-5" : "p-5")}>{children}</div>
    </motion.section>
  );
}

export function Stat({ label, value, hint, tone = "default", delay = 0 }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "blue" | "green" | "red"; delay?: number }) {
  const toneCls = { default: "text-white", blue: "text-electric-400", green: "text-success-400", red: "text-red-400" }[tone];
  return (
    <Card delay={delay}>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</p>
      <p className={clsx("mt-2 text-[28px] font-semibold tabular-nums tracking-tight", toneCls)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </Card>
  );
}

const BADGE: Record<string, string> = {
  green: "bg-success/10 text-success-400 ring-success/20",
  blue: "bg-electric/10 text-electric-400 ring-electric/25",
  red: "bg-red-500/10 text-red-400 ring-red-500/20",
  amber: "bg-amber-500/10 text-amber-300 ring-amber-500/20",
  zinc: "bg-white/5 text-zinc-300 ring-white/10",
};
export function Badge({ children, tone = "zinc", pulse }: { children: ReactNode; tone?: keyof typeof BADGE; pulse?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", BADGE[tone])}>
      {pulse && <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" /></span>}
      {children}
    </span>
  );
}

export const STATE_TONE: Record<string, keyof typeof BADGE> = {
  PENDING: "zinc", RESEARCHING: "blue", APPROVED: "blue", COPY_GENERATED: "blue", READY_TO_PUBLISH: "amber",
  PUBLISHING: "amber", PUBLISHED: "green", FAILED: "red", REJECTED: "zinc",
  SENT: "green", DRY_RUN: "blue", MANUAL_PENDING: "amber", MANUAL_CONFIRMED: "green", QUEUED: "zinc", SENDING: "amber", CANCELLED: "zinc",
  SUCCESS: "green", RUNNING: "blue", SKIPPED: "zinc",
  IDLE: "zinc", PAUSED: "amber", ERROR: "red", STOPPED: "red",
  VERIFIED: "green", CONFIGURED: "blue", NOT_CONFIGURED: "zinc",
};
export const STATE_LABEL: Record<string, string> = {
  PENDING: "Pendente", RESEARCHING: "Pesquisando", APPROVED: "Aprovado", COPY_GENERATED: "Copy gerada", READY_TO_PUBLISH: "Pronto p/ publicar",
  PUBLISHING: "Publicando", PUBLISHED: "Publicado", FAILED: "Falhou", REJECTED: "Rejeitado",
  SENT: "Enviado", DRY_RUN: "Simulação (teste)", MANUAL_PENDING: "Aguardando envio manual", MANUAL_CONFIRMED: "Enviado manualmente", QUEUED: "Na fila", SENDING: "Enviando", CANCELLED: "Cancelado",
  SUCCESS: "Sucesso", RUNNING: "Executando", SKIPPED: "Ignorado", IDLE: "Ocioso", PAUSED: "Pausado", ERROR: "Erro", STOPPED: "Parado",
  VERIFIED: "Verificado", CONFIGURED: "Configurado", NOT_CONFIGURED: "Não configurado",
};
export function StateBadge({ state }: { state: string }) {
  return <Badge tone={STATE_TONE[state] ?? "zinc"} pulse={state === "RUNNING" || state === "PUBLISHING" || state === "RESEARCHING"}>{STATE_LABEL[state] ?? state}</Badge>;
}

export function Button({ children, variant = "secondary", loading, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost"; loading?: boolean }) {
  const v = {
    primary: "bg-electric-600 text-white hover:bg-electric-500 shadow-glow",
    secondary: "bg-white/[0.06] text-zinc-200 hover:bg-white/[0.1] ring-1 ring-inset ring-white/10",
    danger: "bg-red-600 text-white hover:bg-red-500",
    ghost: "text-zinc-400 hover:text-white hover:bg-white/5",
  }[variant];
  return (
    <button {...props} disabled={props.disabled || loading} className={clsx("inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition disabled:cursor-not-allowed disabled:opacity-50", v, className)}>
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-zinc-500">
            {head.map((h, i) => <th key={i} className="px-5 py-2.5 font-medium">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">{children}</tbody>
      </table>
      {empty && <p className="px-5 py-10 text-center text-sm text-zinc-500">Nenhum registro.</p>}
    </div>
  );
}

export function Td({ children, className }: { children?: ReactNode; className?: string }) {
  return <td className={clsx("px-5 py-3 align-top text-zinc-300", className)}>{children}</td>;
}

export function Loading() {
  return <div className="flex h-40 items-center justify-center text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
}

export function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-300 ring-1 ring-red-500/20">{error}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={clsx("h-9 w-full rounded-lg bg-ink-800 px-3 text-sm text-white placeholder:text-zinc-600 ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-electric-500", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx("h-9 rounded-lg bg-ink-800 px-3 text-sm text-white ring-1 ring-inset ring-white/10 focus:outline-none focus:ring-electric-500", props.className)} />;
}

export function Progress({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className={clsx("h-full rounded-full", pct >= 100 ? "bg-success" : "bg-electric-500")} />
    </div>
  );
}
