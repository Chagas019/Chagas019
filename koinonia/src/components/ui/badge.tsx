import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-white/10 text-ink-muted",
      brand: "bg-navy-500/20 text-navy-200",
      gold: "bg-gold-400/15 text-gold-300",
      success: "bg-success-soft text-success",
      danger: "bg-danger-soft text-danger",
      warning: "bg-warning-soft text-warning",
      info: "bg-info-soft text-info",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
