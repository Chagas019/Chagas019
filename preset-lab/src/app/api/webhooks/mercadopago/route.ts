import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/config";
import { verifyWebhookSignature } from "@/lib/payments/mercadopago";
import { processMercadoPagoPayment } from "@/lib/services/checkout";

export const dynamic = "force-dynamic";

/**
 * Webhook do Mercado Pago.
 * 1. valida a assinatura (x-signature + x-request-id) com MP_WEBHOOK_SECRET;
 * 2. consulta o pagamento na API do Mercado Pago (o corpo da notificação não é confiável);
 * 3. confirma de forma idempotente (payment_events com chave única).
 */
export async function POST(request: NextRequest) {
  if (config.payments !== "mercadopago" || !config.mpAccessToken || !config.mpWebhookSecret) {
    return NextResponse.json({ error: "Mercado Pago não configurado." }, { status: 503 });
  }
  const url = new URL(request.url);
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await request.json();
  } catch {
    // algumas notificações chegam só com query string
  }
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body.type ?? "";
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id !== undefined ? String(body.data.id) : null);

  const valid = verifyWebhookSignature({ secret: config.mpWebhookSecret, xSignature: request.headers.get("x-signature"), xRequestId: request.headers.get("x-request-id"), dataId });
  if (!valid) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  if (type !== "payment" || !dataId || !/^\d{1,30}$/.test(dataId)) return NextResponse.json({ ok: true, ignored: true });
  try {
    const result = await processMercadoPagoPayment(dataId);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    console.error("[webhook mercadopago]", e);
    // 500 faz o Mercado Pago reenviar mais tarde; o processamento é idempotente
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }
}
