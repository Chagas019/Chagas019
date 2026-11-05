import type { ReactNode } from "react";
import { Award, BookOpen, Camera, Crown, Flame, FolderOpen, Heart, Infinity as InfinityIcon, LayoutGrid, Sparkles, Type, WandSparkles } from "lucide-react";
import type { Badge } from "@/lib/gamification";
import { DIFFICULTY_DOTS, DIFFICULTY_LABEL, categoryById } from "@/lib/content/categories";
import type { CategoryId, Difficulty } from "@/lib/types";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#d4ff3a" />
        <path d="M21.5 10.2a8 8 0 1 0 0 11.6" stroke="#0a0a0a" strokeWidth="3.4" strokeLinecap="round" fill="none" />
        <circle cx="22.2" cy="16" r="2.3" fill="#0a0a0a" />
      </svg>
      <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">
        CRIATIVA<span className="text-lime">LAB</span>
      </span>
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  accent,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  accent?: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-10 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
      <div className="max-w-3xl">
        <p className="label mb-4 flex items-center gap-2">
          <span className="inline-block size-1.5 rounded-full bg-lime" />
          {eyebrow}
        </p>
        <h1 className="display text-[clamp(2.4rem,6vw,4.6rem)]">
          {title} {accent && <span className="accent-serif text-lime">{accent}</span>}
        </h1>
        {description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-fog">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card grid place-items-center gap-3 px-6 py-14 text-center">
      <div className="grid size-12 place-items-center rounded-full border border-line text-lime">{icon}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-fog">{text}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function CategoryTag({ id }: { id: CategoryId }) {
  const c = categoryById(id);
  return (
    <span className="label inline-flex items-center gap-1.5 !text-paper/80">
      <span className="size-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

export function DifficultyDots({ level }: { level: Difficulty }) {
  const n = DIFFICULTY_DOTS[level];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-fog" title={DIFFICULTY_LABEL[level]}>
      <span className="flex gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span key={i} className={`h-2.5 w-1 rounded-full ${i <= n ? "bg-lime" : "bg-white/15"}`} />
        ))}
      </span>
      {DIFFICULTY_LABEL[level]}
    </span>
  );
}

const BADGE_ICONS = {
  spark: Sparkles,
  flame: Flame,
  camera: Camera,
  type: Type,
  book: BookOpen,
  folder: FolderOpen,
  heart: Heart,
  wand: WandSparkles,
  crown: Crown,
  infinity: InfinityIcon,
  grid: LayoutGrid,
} as const;

export function BadgeMedal({ badge, earned, compact }: { badge: Badge; earned: boolean; compact?: boolean }) {
  const Icon = BADGE_ICONS[badge.icon] ?? Award;
  return (
    <div
      className={`group relative flex items-center gap-3 ${compact ? "" : "card p-4"} ${earned ? "" : "opacity-45"}`}
      title={`${badge.name} — ${badge.description}`}
    >
      <div
        className={`relative grid size-11 shrink-0 place-items-center rounded-full border transition-transform duration-500 group-hover:rotate-[12deg] ${
          earned ? "border-lime/50 bg-lime/10 text-lime" : "border-line text-mute"
        }`}
      >
        <Icon className="size-[18px]" aria-hidden />
        {earned && <span className="absolute -inset-1 rounded-full border border-dashed border-lime/30 animate-spin-slow" aria-hidden />}
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-sm font-medium">{badge.name}</p>
          <p className="text-xs text-fog">{badge.description}</p>
        </div>
      )}
      <span className="sr-only">{earned ? "Conquistada" : "Bloqueada"}</span>
    </div>
  );
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ontem";
  if (d < 30) return `há ${d} dias`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
