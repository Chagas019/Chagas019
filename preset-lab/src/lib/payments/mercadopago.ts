import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Integração com o Mercado Pago (Checkout Pro). Só roda no servidor.
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro
 */
const API = "https://api.mercadopago.com";

export interface PreferenceInput {
  purchaseId: string;
  title: string;
  unitPriceCents: number;
  payerEmail: string;
  siteUrl: string;
}

export async function createPreference(token: string, input: PreferenceInput): Promise<{ id: string; initPoint: string }> {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      // idempotência: a mesma compra nunca gera duas preferências
      "X-Idempotency-Key": `pref-${input.purchaseId}`,
    },
    body: JSON.stringify({
      items: [{ id: input.purchaseId, title: input.title.slice(0, 250), quantity: 1, currency_id: "BRL", unit_price: input.unitPriceCents / 100 }],
      external_reference: input.purchaseId,
      payer: { email: input.payerEmail },
      back_urls: {
        success: `${input.siteUrl}/checkout/retorno?compra=${input.purchaseId}`,
        pending: `${input.siteUrl}/checkout/retorno?compra=${input.purchaseId}`,
        failure: `${input.siteUrl}/checkout/retorno?compra=${input.purchaseId}`,
      },
      auto_return: "approved",
      notification_url: `${input.siteUrl}/api/webhooks/mercadopago`,
      statement_descriptor: "PRESETLAB",
      // PIX, cartão e boleto ficam disponíveis conforme a conta do vendedor
      payment_methods: { installments: 1 },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago recusou a preferência (${res.status}).`);
  const data = (await res.json()) as { id: string; init_point: string };
  return { id: data.id, initPoint: data.init_point };
}

export interface MpPayment {
  id: number;
  status: "approved" | "pending" | "in_process" | "rejected" | "cancelled" | "refunded" | "charged_back" | string;
  external_reference: string | null;
  transaction_amount: number;
  currency_id: string;
}

/** Consulta o pagamento direto na API (nunca confia no corpo do webhook). */
export async function fetchPayment(token: string, paymentId: string): Promise<MpPayment> {
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(paymentId)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`Pagamento ${paymentId} não encontrado (${res.status}).`);
  return (await res.json()) as MpPayment;
}

/**
 * Valida a assinatura do webhook (header x-signature: "ts=...,v1=...").
 * Manifesto: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" assinado com HMAC-SHA256.
 */
export function verifyWebhookSignature(args: { secret: string; xSignature: string | null; xRequestId: string | null; dataId: string | null; toleranceSeconds?: number; nowMs?: number }): boolean {
  if (!args.secret || !args.xSignature || !args.dataId) return false;
  const parts = Object.fromEntries(
    args.xSignature.split(",").map((kv) => {
      const [k, ...v] = kv.split("=");
      return [k.trim(), v.join("=").trim()];
    })
  );
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]+$/i.test(v1)) return false;
  // ts vem em milissegundos; rejeita notificações antigas (replay)
  const tsMs = Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000;
  const tolerance = (args.toleranceSeconds ?? 600) * 1000;
  if (!Number.isFinite(tsMs) || Math.abs((args.nowMs ?? Date.now()) - tsMs) > tolerance) return false;
  const id = /^[a-z0-9]+$/i.test(args.dataId) ? args.dataId.toLowerCase() : args.dataId;
  let manifest = `id:${id};`;
  if (args.xRequestId) manifest += `request-id:${args.xRequestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", args.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
