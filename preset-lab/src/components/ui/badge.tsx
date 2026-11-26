import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badge = cva("lab-label inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 leading-none", {
  variants: {
    tone: {
      free: "bg-bone text-ink",
      premium: "bg-signal text-signal-ink",
      club: "border border-signal/60 text-signal",
      neutral: "border border-bone/20 text-ash",
      ok: "bg-ok/15 text-ok",
      warn: "bg-signal/15 text-signal",
      danger: "bg-danger/15 text-danger",
      dark: "bg-ink/80 text-bone backdrop-blur",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badge>) {
  return <span className={cn(badge({ tone }), className)} {...props} />;
}
