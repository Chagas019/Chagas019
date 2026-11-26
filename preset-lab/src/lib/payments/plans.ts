import type { PlanId } from "@/lib/types";

/** Planos do Premium Club. Preços em centavos (BRL). Pagamento pré-pago por período. */
export const PLANS: Record<PlanId, { id: PlanId; name: string; price_cents: number; period: string; note: string }> = {
  premium_monthly: { id: "premium_monthly", name: "Premium Club — Mensal", price_cents: 1990, period: "mês", note: "Acesso por 1 mês" },
  premium_yearly: { id: "premium_yearly", name: "Premium Club — Anual", price_cents: 17900, period: "ano", note: "Equivale a R$ 14,92/mês" },
};

export const isPlanId = (v: unknown): v is PlanId => v === "premium_monthly" || v === "premium_yearly";
