import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-sand-100", className)} />;
}

export function CardGridSkeleton({ count = 6, label }: { count?: number; label: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="rounded-xl border border-border/70 bg-surface p-6">
          <Skeleton className="mb-3 h-5 w-2/3" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="mb-5 h-4 w-5/6" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
