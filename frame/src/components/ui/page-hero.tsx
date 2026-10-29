import { Sparkle } from "./sparkle";
import { cn } from "@/lib/utils";

/** Faixa de abertura das seções: azul elétrico, título condensado gigante e estrela limão. */
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
    <section className={cn("relative overflow-hidden bg-cobalt-500", className)}>
      <Sparkle className="spin-slow absolute -right-6 -top-6 size-28 text-volt-500/90 sm:right-10 sm:top-8 sm:size-14" />
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 pb-10 pt-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-10 lg:pb-14 lg:pt-14">
        <div className="max-w-4xl space-y-4">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-paper">
            <Sparkle className="size-3.5 text-volt-500" />
            {eyebrow}
          </p>
          <h1 className="font-display text-[clamp(2.8rem,8vw,6.5rem)] leading-[0.88] text-balance text-volt-500">{title}</h1>
          {children ? <p className="max-w-2xl text-pretty text-paper/85">{children}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </section>
  );
}
