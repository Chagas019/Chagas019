import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap select-none transition-[background,color,box-shadow,transform] duration-200 ease-[var(--ease-out-expo)] active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-volt-500 text-ink-950 font-semibold hover:bg-volt-400 shadow-[0_8px_24px_-12px_rgb(213_255_64/0.45)]",
  secondary: "bg-ink-750 text-paper ring-1 ring-inset ring-ink-600 hover:bg-ink-700",
  outline: "bg-transparent text-volt-500 ring-1 ring-inset ring-volt-500/60 hover:ring-volt-500 hover:bg-volt-500/[0.06]",
  ghost: "bg-transparent text-fog-300 hover:text-paper hover:bg-white/[0.05]",
  danger: "bg-danger-500/15 text-danger-400 hover:bg-danger-500/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-[var(--radius-xs)]",
  md: "h-10 px-4 text-sm rounded-[var(--radius-sm)]",
  lg: "h-12 px-6 text-base rounded-[var(--radius-sm)]",
  icon: "h-10 w-10 rounded-[var(--radius-sm)]",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button ref={ref} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
