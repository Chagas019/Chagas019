import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  info: { cls: "border-info/25 bg-info-soft text-info", Icon: Info },
  success: { cls: "border-success/25 bg-success-soft text-success", Icon: CheckCircle2 },
  warning: { cls: "border-warning/25 bg-warning-soft text-warning", Icon: AlertTriangle },
  danger: { cls: "border-danger/25 bg-danger-soft text-danger", Icon: XCircle },
} as const;

/** Mensagem contextual. Use live="polite" para feedback de formulários (anunciado por leitores de tela). */
export function Alert({
  tone = "info", title, children, className, live,
}: { tone?: keyof typeof tones; title?: string; children?: ReactNode; className?: string; live?: "polite" | "assertive" }) {
  const { cls, Icon } = tones[tone];
  return (
    <div role={live === "assertive" ? "alert" : live ? "status" : undefined} aria-live={live} className={cn("flex gap-3 rounded-lg border p-4 text-sm", cls, className)}>
      <Icon aria-hidden className="mt-0.5 size-5 shrink-0" />
      <div className="space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="leading-relaxed text-ink">{children}</div> : null}
      </div>
    </div>
  );
}
