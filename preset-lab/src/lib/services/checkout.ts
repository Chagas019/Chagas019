import "server-only";
import { config } from "@/lib/config";
import { createPreference, fetchPayment } from "@/lib/payments/mercadopago";
import { PLANS } from "@/lib/payments/plans";
import { repo } from "@/lib/repo";
import type { PlanId, Purchase, PurchaseItem, PurchaseKind, SessionUser } from "@/lib/types";
import { canBePurchased } from "./access";

export class CheckoutError extends Error {
  constructor(
    public code: "not_found" | "not_for_sale" | "already_owned" | "already_subscribed" | "rate_limited" | "provider" | "forbidden",
    message: string
  ) {
    super(message);
  }
}

export type CheckoutTarget = { type: "product"; id: string } | { type: "collection"; id: string } | { type: "plan"; plan: PlanId };

/**
 * Inicia uma compra. O preço SEMPRE vem do banco/servidor — nunca do formulário.
 * Retorna a URL para onde o usuário deve ir (Mercado Pago ou checkout simulado de desenvolvimento).
 */
export async function startCheckout(user: SessionUser, target: CheckoutTarget): Promise<{ redirectUrl: string; purchase: Purchase }> {
  const r = repo();
  if (!(await r.rateLimit(`checkout:${user.id}`, 60, 10))) throw new CheckoutError("rate_limited", "Muitas tentativas. Aguarde um minuto.");

  let kind: PurchaseKind;
  let title: string;
  let items: Omit<PurchaseItem, "id" | "purchase_id">[];

  if (target.type === "product") {
    const p = await r.getProductById(target.id);
    if (!p) throw new CheckoutError("not_found", "Produto não encontrado.");
    if (p.product_type !== "premium" || !canBePurchased(p.access_mode) || p.price_cents <= 0) throw new CheckoutError("not_for_sale", "Este produto não é vendido avulso.");
    const owned = await r.listOwnedProductIds(user.id);
    if (owned.includes(p.id)) throw new CheckoutError("already_owned", "Você já possui este preset. Ele está na sua biblioteca.");
    kind = "product";
    title = p.name;
    items = [{ product_id: p.id, collection_id: null, plan: null, title: p.name, unit_price_cents: p.price_cents }];
  } else if (target.type === "collection") {
    const c = await r.getCollectionById(target.id);
    if (!c || c.status !== "published") throw new CheckoutError("not_found", "Coleção não encontrada.");
    if (!c.price_cents) throw new CheckoutError("not_for_sale", "Esta coleção não é vendida como pacote.");
    const owned = new Set(await r.listOwnedProductIds(user.id));
    if (c.product_ids.length && c.product_ids.every((id) => owned.has(id))) throw new CheckoutError("already_owned", "Você já possui todos os presets desta coleção.");
    kind = "collection";
    title = `Coleção ${c.title}`;
    items = [{ product_id: null, collection_id: c.id, plan: null, title, unit_price_cents: c.price_cents }];
  } else {
    const plan = PLANS[target.plan];
    if (!plan) throw new CheckoutError("not_found", "Plano não encontrado.");
    if (await r.getActiveSubscription(user.id)) throw new CheckoutError("already_subscribed", "Sua assinatura Premium Club já está ativa.");
    kind = "subscription";
    title = plan.name;
    items = [{ product_id: null, collection_id: null, plan: plan.id, title: plan.name, unit_price_cents: plan.price_cents }];
  }

  // reaproveita uma compra pendente idêntica (evita pedidos duplicados por clique duplo)
  const provider = config.payments;
  const recent = (await r.listPurchases(user.id)).find(
    (p) =>
      p.status === "pending" &&
      p.provider === provider &&
      p.kind === kind &&
      Date.now() - Date.parse(p.created_at) < 30 * 60 * 1000 &&
      p.items.length === items.length &&
      p.items.every((it, i) => it.product_id === items[i].product_id && it.collection_id === items[i].collection_id && it.plan === items[i].plan && it.unit_price_cents === items[i].unit_price_cents)
  );
  const purchase = recent ?? (await r.createPurchase({ userId: user.id, kind, provider, isSimulated: provider === "dev", items }));

  if (provider === "dev") {
    return { redirectUrl: `/checkout/simulado/${purchase.id}`, purchase };
  }
  try {
    const pref = await createPreference(config.mpAccessToken, { purchaseId: purchase.id, title, unitPriceCents: purchase.total_cents, payerEmail: user.email, siteUrl: config.siteUrl });
    await r.setPurchaseProviderReference(purchase.id, pref.id);
    return { redirectUrl: pref.initPoint, purchase };
  } catch (e) {
    console.error("[checkout] Mercado Pago:", e);
    throw new CheckoutError("provider", "Não foi possível abrir o pagamento agora. Tente novamente em instantes.");
  }
}

/**
 * Checkout SIMULADO (somente desenvolvimento). Bloqueado em produção por assertSafeConfig e aqui.
 * Usa exatamente o mesmo fluxo de confirmação idempotente do webhook real.
 */
export async function simulatePayment(user: SessionUser, purchaseId: string, outcome: "approve" | "reject") {
  if (config.payments !== "dev" || (config.isProd && !config.allowLocalDemo)) throw new CheckoutError("forbidden", "Checkout simulado indisponível.");
  const r = repo();
  const p = await r.getPurchase(purchaseId);
  if (!p || p.user_id !== user.id || p.provider !== "dev") throw new CheckoutError("not_found", "Compra não encontrada.");
  if (outcome === "reject") {
    await r.setPurchaseStatus(p.id, "failed");
    return "failed" as const;
  }
  return r.fulfillPurchase({ purchaseId: p.id, providerPaymentId: `sim-${p.id}`, eventId: `dev:${p.id}:approved`, provider: "dev", payload: { simulated: true } });
}

/**
 * Processa uma notificação de pagamento do Mercado Pago JÁ com assinatura validada.
 * Consulta o pagamento na API e confere referência, valor e moeda antes de liberar.
 */
export async function processMercadoPagoPayment(paymentId: string) {
  const r = repo();
  const pay = await fetchPayment(config.mpAccessToken, paymentId);
  const purchaseId = pay.external_reference ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(purchaseId)) return "ignored_no_reference";
  const purchase = await r.getPurchase(purchaseId);
  if (!purchase || purchase.provider !== "mercadopago") return "purchase_not_found";

  if (pay.status === "approved") {
    const expected = purchase.total_cents / 100;
    if (pay.currency_id !== "BRL" || Math.abs(pay.transaction_amount - expected) > 0.009) {
      console.error(`[webhook] valor divergente na compra ${purchase.id}: pago ${pay.transaction_amount} ${pay.currency_id}, esperado ${expected} BRL`);
      return "amount_mismatch";
    }
    return r.fulfillPurchase({ purchaseId, providerPaymentId: String(pay.id), eventId: `payment:${pay.id}:approved`, provider: "mercadopago", payload: { id: pay.id, status: pay.status, amount: pay.transaction_amount } });
  }
  if (pay.status === "rejected" || pay.status === "cancelled") {
    await r.setPurchaseStatus(purchaseId, "failed");
    return "marked_failed";
  }
  if (pay.status === "refunded" || pay.status === "charged_back") {
    await r.setPurchaseStatus(purchaseId, "refunded");
    return "marked_refunded";
  }
  return "pending";
}
