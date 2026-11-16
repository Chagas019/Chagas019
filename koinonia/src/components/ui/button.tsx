import { forwardRef, type ButtonHTMLAttributes } from "react";
import Link, { type LinkProps } from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition-[background-color,box-shadow,transform,color] duration-200 active:translate-y-px disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55 [&_svg]:size-[1.1em] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-lime-400 text-night-950 shadow-soft hover:bg-lime-300 hover:shadow-gold",
        gold: "bg-violet-600 text-white shadow-soft hover:bg-violet-500",
        outline: "border-2 border-violet-500 bg-transparent text-ink hover:border-lime-400 hover:text-lime-300",
        ghost: "text-ink hover:bg-white/5",
        danger: "bg-danger text-night-950 hover:brightness-110",
        link: "h-auto rounded-none p-0 text-accent-ink underline-offset-4 hover:underline",
        onDark: "border-2 border-violet-500 bg-night-950/40 text-white hover:border-lime-400",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[0.95rem]",
        lg: "h-13 px-7 text-base",
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
