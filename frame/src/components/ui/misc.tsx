import Image from "next/image";
import { cn, mediaUrl } from "@/lib/utils";

export function Avatar({ mediaId, name, size = 36, className }: { mediaId: string | null | undefined; name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-volt-700 to-cobalt-500 text-paper", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.36) }}
      aria-hidden={mediaId ? undefined : true}
    >
      {mediaId ? (
        <Image src={mediaUrl(mediaId, "thumb")} alt={`Foto de ${name}`} fill sizes={`${size}px`} className="object-cover" unoptimized />
      ) : (
        <span className="font-semibold">{initials || "·"}</span>
      )}
    </span>
  );
}

export function Badge({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "volt" | "cobalt" | "ember" | "mint" | "danger"; className?: string }) {
  const tones = {
    neutral: "bg-white/[0.06] text-fog-300",
    volt: "bg-volt-500/15 text-volt-300",
    cobalt: "bg-cobalt-500/15 text-cobalt-400",
    ember: "bg-ember-400/15 text-ember-400",
    mint: "bg-mint-400/15 text-mint-400",
    danger: "bg-danger-500/15 text-danger-400",
  } as const;
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-[var(--radius-md)]", className)} aria-hidden />;
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center">
      {icon ? <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-ink-800 text-volt-400 ring-1 ring-ink-700">{icon}</div> : null}
      <h2 className="font-display text-3xl text-paper">{title}</h2>
      {children ? <div className="mt-2 text-pretty text-fog-400">{children}</div> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, children, className }: { eyebrow?: string; title: string; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.18em] text-volt-400">{eyebrow}</p> : null}
      <h1 className="font-display text-4xl leading-[1.05] text-balance text-paper sm:text-5xl">{title}</h1>
      {children ? <p className="max-w-2xl text-pretty text-fog-400">{children}</p> : null}
    </div>
  );
}

export function Container({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}
