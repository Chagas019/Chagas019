import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Section({
  id, eyebrow, title, description, action, children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
  children: ReactNode;
}) {
  const headingId = id ? `${id}-titulo` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className="mx-auto mt-20 max-w-7xl px-4 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h2 id={headingId} className="mt-1.5 text-2xl font-bold sm:text-3xl">{title}</h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{description}</p>}
        </div>
        {action && (
          <Link href={action.href} className="flex shrink-0 items-center gap-1 rounded-lg py-2 text-sm font-semibold text-cyan hover:underline">
            {action.label} <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line-strong bg-white/5 text-cyan">{icon}</div>
      <p className="mt-4 font-display text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-14">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-bold sm:text-5xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{children}</div>}
    </div>
  );
}
