import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3.5", {
  variants: {
    tone: {
      neutral: "bg-sand-100 text-sand-700",
      brand: "bg-navy-100 text-navy-800",
      gold: "bg-gold-100 text-gold-800",
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
