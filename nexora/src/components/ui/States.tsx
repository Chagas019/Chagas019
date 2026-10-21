import type { ReactNode } from 'react';
import { RotateCcw, SearchX, TriangleAlert } from 'lucide-react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function CardSkeleton() {
  return (
    <div className="space-y-3" aria-hidden>
      <Skeleton className="aspect-[4/3] w-full rounded-lg" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function LoadingGrid({ n = 6, label = 'Carregando imóveis' }: { n?: number; label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <span className="sr-only">{label}…</span>
      <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: n }, (_, i) => <CardSkeleton key={i} />)}</div>
    </div>
  );
}

export function EmptyState({ title, text, action, icon }: { title: string; text?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="surface blueprint-grid flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border hairline text-muted">{icon ?? <SearchX size={20} />}</div>
      <h3 className="text-display-sm font-medium">{title}</h3>
      {text && <p className="mt-2 max-w-md text-sm text-muted">{text}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Algo não carregou', text, onRetry }: { title?: string; text?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="surface flex flex-col items-center px-6 py-14 text-center">
      <TriangleAlert className="mb-4 text-danger" size={22} />
      <h3 className="text-lg font-medium">{title}</h3>
      {text && <p className="mt-2 max-w-md text-sm text-muted">{text}</p>}
      {onRetry && <button type="button" onClick={onRetry} className="btn-ghost mt-6"><RotateCcw size={16} /> Tentar novamente</button>}
    </div>
  );
}
