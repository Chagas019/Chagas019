import { cn } from "@/lib/utils";

/** Setas e rabiscos "feitos à mão" em verde neon (decorativos). */
export function ScribbleArrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 90 70" className={cn("pointer-events-none", className)} fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 40c10-18 22-22 30-10s4 22 14 18 16-26 30-30" />
      <path d="M8 40l2 16M8 40l15 2" />
    </svg>
  );
}

export function DashArrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 70 30" className={cn("pointer-events-none", className)} fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M64 16C48 10 30 20 8 14" />
      <path d="M18 4L6 14l12 10" />
    </svg>
  );
}

/** Emblema com texto circular girando lentamente ao redor da cruz. */
export function RotatingEmblem({ text, className }: { text: string; className?: string }) {
  return (
    <div aria-hidden className={cn("relative", className)}>
      <svg viewBox="0 0 200 200" className="absolute inset-0 animate-spin-slow">
        <defs><path id="koi-circle" d="M100,100 m-78,0 a78,78 0 1,1 156,0 a78,78 0 1,1 -156,0" /></defs>
        <text fill="#F5F5F5" fontSize="14" fontWeight="700" letterSpacing="4.2" fontFamily="var(--font-montserrat), sans-serif">
          <textPath href="#koi-circle">{text}</textPath>
        </text>
      </svg>
      <svg viewBox="0 0 200 200" className="absolute inset-0">
        <circle cx="100" cy="100" r="52" fill="#1C1C1C" stroke="rgb(255 255 255 / 0.12)" />
        <path d="M100 66v68M78 90h44" stroke="#8CFF5A" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}
