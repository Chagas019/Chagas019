import { Badge } from "@/components/ui/badge";
import type { PurchaseStatus, SubscriptionStatus } from "@/lib/types";

const PRODUCT: Record<string, { label: string; tone: "ok" | "neutral" | "warn" }> = {
  published: { label: "Publicado", tone: "ok" },
  draft: { label: "Rascunho", tone: "neutral" },
  archived: { label: "Arquivado", tone: "warn" },
};
export function ProductStatusBadge({ status }: { status: string }) {
  const s = PRODUCT[status] ?? { label: status, tone: "neutral" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export const PURCHASE_LABEL: Record<PurchaseStatus, string> = { pending: "Pendente", paid: "Pago", failed: "Falhou", refunded: "Reembolsado", cancelled: "Cancelado" };
export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  const tone = status === "paid" ? "ok" : status === "pending" ? "neutral" : "danger";
  return <Badge tone={tone}>{PURCHASE_LABEL[status] ?? status}</Badge>;
}

const SUB_LABEL: Record<SubscriptionStatus, string> = { pending: "Pendente", active: "Ativa", past_due: "Em atraso", cancelled: "Cancelada", expired: "Expirada" };
export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus }) {
  const tone = status === "active" ? "ok" : status === "past_due" || status === "pending" ? "warn" : "neutral";
  return <Badge tone={tone}>{SUB_LABEL[status] ?? status}</Badge>;
}

export function SimulatedBadge() {
  return (
    <Badge tone="warn" title="Pedido criado pelo checkout simulado de desenvolvimento — não é receita real">
      Simulado
    </Badge>
  );
}

export const PLAN_LABEL: Record<string, string> = { premium_monthly: "Club mensal", premium_yearly: "Club anual" };
export const PROVIDER_LABEL: Record<string, string> = { mercadopago: "Mercado Pago", dev: "Checkout de teste" };
