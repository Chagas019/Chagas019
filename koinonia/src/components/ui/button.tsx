import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform,color,border-color] duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] [&_svg]:transition-transform hover:[&_svg]:translate-x-0.5 disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-gold-400 text-night-950 uppercase tracking-[0.12em] shadow-soft hover:bg-gold-300 hover:shadow-gold",
        gold: "bg-navy-600 text-white uppercase tracking-[0.12em] shadow-soft hover:bg-navy-500",
        outline: "border border-gold-400/70 bg-transparent text-ink uppercase tracking-[0.12em] hover:bg-gold-400/10 hover:border-gold-300",
        ghost: "text-ink hover:bg-white/5",
        danger: "bg-danger text-night-950 hover:brightness-110",
        link: "h-auto rounded-none p-0 text-accent-ink underline-offset-4 hover:underline",
        onDark: "border border-gold-400/70 bg-night-950/40 text-white uppercase tracking-[0.12em] hover:bg-gold-400/10",
      },
      size: {
        sm: "h-9 px-4 text-xs",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-sm",
        icon: "size-11",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, Variants {
  loading?: boolean;
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, loading = false, loadingLabel, disabled, children, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size="sm" label={loadingLabel} /> : null}
      {children}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps, Variants {
  className?: string;
  children: React.ReactNode;
  "aria-label"?: string;
}

export function ButtonLink({ className, variant, size, children, ...props }: ButtonLinkProps) {
  return (
    <Link className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </Link>
  );
}
