import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string | undefined> } | undefined;

export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (!state?.error && !state?.message) return null;
  const isError = !!state.error;
  return (
    <div role={isError ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", isError ? "border-danger/40 bg-danger/10 text-danger" : "border-ok/40 bg-ok/10 text-ok", className)}>
      {isError ? <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>{state.error ?? state.message}</span>
    </div>
  );
}
