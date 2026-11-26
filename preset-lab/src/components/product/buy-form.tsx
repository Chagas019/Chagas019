"use client";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { checkoutAction } from "@/app/actions/library";
import { FormMessage, type ActionState } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import type { ButtonProps } from "@/components/ui/button";

/** Botão de compra (produto, coleção ou plano). O preço é recalculado no servidor. */
export function BuyForm({ type, id, back, label, variant = "signal", className, testId = "buy-button" }: { type: "product" | "collection" | "plan"; id: string; back: string; label: string; variant?: ButtonProps["variant"]; className?: string; testId?: string }) {
  const [state, action] = useActionState<ActionState, FormData>(checkoutAction, undefined);
  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="back" value={back} />
      <SubmitButton size="lg" variant={variant} className={className ?? "w-full"} pendingLabel="Abrindo pagamento…" data-testid={testId}>
        {label} <ArrowRight />
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
