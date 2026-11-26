import type { AccessMode, ProductStatus } from "@/lib/types";

export type AccessReason =
  | "admin"
  | "free"
  | "owned"
  | "subscription"
  | "login_required"
  | "purchase_required"
  | "subscription_required"
  | "purchase_or_subscription_required"
  | "unavailable";

export interface AccessContext {
  loggedIn: boolean;
  isAdmin: boolean;
  owns: boolean;
  hasActiveSubscription: boolean;
}

/**
 * Decisão de acesso a um produto — fonte única no servidor.
 * Espelhada em SQL por public.can_access_product (defesa em profundidade).
 */
export function decideAccess(product: { access_mode: AccessMode; status: ProductStatus }, ctx: AccessContext): { allowed: boolean; reason: AccessReason } {
  if (ctx.loggedIn && ctx.isAdmin) return { allowed: true, reason: "admin" };
  if (product.status !== "published") return { allowed: false, reason: "unavailable" };
  if (!ctx.loggedIn) return { allowed: false, reason: "login_required" };
  const m = product.access_mode;
  if (m === "free") return { allowed: true, reason: "free" };
  if ((m === "purchase_or_subscription" || m === "purchase_only") && ctx.owns) return { allowed: true, reason: "owned" };
  if ((m === "purchase_or_subscription" || m === "subscription_only") && ctx.hasActiveSubscription) return { allowed: true, reason: "subscription" };
  if (m === "purchase_only") return { allowed: false, reason: "purchase_required" };
  if (m === "subscription_only") return { allowed: false, reason: "subscription_required" };
  return { allowed: false, reason: "purchase_or_subscription_required" };
}

export const canBePurchased = (m: AccessMode) => m === "purchase_or_subscription" || m === "purchase_only";
export const includedInSubscription = (m: AccessMode) => m === "purchase_or_subscription" || m === "subscription_only";

export const ACCESS_LABEL: Record<AccessMode, string> = {
  free: "Gratuito",
  purchase_or_subscription: "Compra avulsa ou Premium Club",
  purchase_only: "Somente compra avulsa",
  subscription_only: "Exclusivo Premium Club",
};
