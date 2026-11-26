import type { ReactNode } from "react";

/** Cabeçalho editorial das páginas do Admin Studio. */
export function AdminPageHead({ kicker, title, description, actions }: { kicker: string; title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-5 border-b hairline pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <p className="lab-label text-signal">{kicker}</p>
        <h1 className="display mt-3 break-words text-[clamp(2.5rem,6vw,4.5rem)]">{title}</h1>
        {description && <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ash">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border-y hairline py-10 text-center text-sm text-smoke">{children}</p>;
}

export function Notice({ tone = "ok", children }: { tone?: "ok" | "danger"; children: ReactNode }) {
  return (
    <p role="status" className={tone === "ok" ? "rounded-xl border border-ok/40 bg-ok/10 px-4 py-3 text-sm text-ok" : "rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"}>
      {children}
    </p>
  );
}
