import { cn } from "@/lib/utils";

/** Rabiscos decorativos no estilo "sticker" (sempre aria-hidden). */
type P = { className?: string };
const base = "pointer-events-none select-none";

export const Squiggle = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 120 24" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
    <path d="M4 14c10-12 18 10 28 0s18-12 28 0 18 10 28 0 18-12 28-2" />
  </svg>
);

export const BrushUnderline = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 400 30" className={cn(base, className)} preserveAspectRatio="none">
    <path d="M6 20C90 8 210 4 394 10c-60 6-150 10-240 14-50 2-100 2-148-4z" fill="currentColor" />
  </svg>
);

export const Star = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 40 40" className={cn(base, className)}>
    <path d="M20 3l5 11 12 1.5-9 8 2.5 12L20 29.5 9.5 35.5 12 23.5l-9-8L15 14z" fill="currentColor" />
  </svg>
);

export const StarOutline = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 40 40" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
    <path d="M20 4l4.7 10.4 11.3 1.3-8.4 7.6 2.3 11.2L20 28.9 10.1 34.5l2.3-11.2L4 15.7l11.3-1.3z" />
  </svg>
);

export const Crown = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 60 44" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round">
    <path d="M6 36L4 10l14 12 12-18 12 18 14-12-2 26z" />
    <path d="M8 41h44" />
  </svg>
);

export const Bolt = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 40 56" className={cn(base, className)}>
    <path d="M24 2L4 32h14l-6 22 24-32H22z" fill="currentColor" />
  </svg>
);

export const Smiley = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 48 48" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
    <circle cx="24" cy="24" r="19" />
    <path d="M16 20v2M32 20v2M15 29c5 7 13 7 18 0" />
  </svg>
);

export const CurvedArrow = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 60 80" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M40 6C12 14 4 44 30 70" />
    <path d="M18 68l12 3 2-12" />
  </svg>
);

export const Swirl = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 100 100" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round">
    <path d="M10 80c10-40 30-60 40-40s-30 40-10 40 40-50 50-60" />
  </svg>
);

export const Spark = ({ className }: P) => (
  <svg aria-hidden viewBox="0 0 40 40" className={cn(base, className)} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
    <path d="M20 3v10M20 27v10M3 20h10M27 20h10" />
  </svg>
);

export const Blob = ({ className, d = "M40 10c30-14 80 6 90 40s-10 70-50 72S6 104 4 70 10 24 40 10z" }: P & { d?: string }) => (
  <svg aria-hidden viewBox="0 0 140 130" className={cn(base, className)}>
    <path d={d} fill="currentColor" />
  </svg>
);
