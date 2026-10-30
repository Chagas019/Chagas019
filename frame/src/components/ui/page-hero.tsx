import { cn } from "@/lib/utils";

/** Abertura editorial das seções: rótulo em mono, título condensado grande e ponto limão. */
export function PageHero({
  eyebrow,
  title,
  children,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("relative overflow-x-clip", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-volt-500/[0.06] blur-3xl" />
      <div className="relative mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-6 pt-6 sm:px-6 sm:pt-10 lg:flex-row lg:items-end lg:justify-between lg:px-10">
        <div className="max-w-4xl space-y-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-fog-400">{eyebrow}</p>
          <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.86] text-balance text-paper">
            {title}
            <span className="text-volt-500">.</span>
          </h1>
          {children ? <p className="max-w-2xl text-pretty text-fog-300">{children}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
