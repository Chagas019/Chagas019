"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/forms/form-message";
import { getCurrentUser } from "@/lib/auth";
import { isPlanId } from "@/lib/payments/plans";
import { repo } from "@/lib/repo";
import { CheckoutError, simulatePayment, startCheckout, type CheckoutTarget } from "@/lib/services/checkout";
import { fieldErrors, profileSchema, uuidSchema } from "@/lib/validation/schemas";

/** Favoritar/desfavoritar. Retorna o novo estado. */
export async function toggleFavoriteAction(productId: string, on: boolean): Promise<{ ok: boolean; on?: boolean; error?: string; login?: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, login: true, error: "Entre na sua conta para salvar favoritos." };
  if (!uuidSchema.safeParse(productId).success) return { ok: false, error: "Produto inválido." };
  if (!(await repo().rateLimit(`fav:${user.id}`, 60, 60))) return { ok: false, error: "Calma! Muitas ações seguidas." };
  try {
    await repo().setFavorite(user.id, productId, on);
  } catch {
    return { ok: false, error: "Não foi possível salvar agora." };
  }
  revalidatePath("/lab/favoritos");
  return { ok: true, on };
}

/** Inicia o checkout de produto, coleção ou plano. */
export async function checkoutAction(_: ActionState, form: FormData): Promise<ActionState> {
  const type = form.get("type");
  const id = String(form.get("id") ?? "");
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(String(form.get("back") ?? "/presets"))}`);
  let target: CheckoutTarget;
  if (type === "plan" && isPlanId(id)) target = { type: "plan", plan: id };
  else if ((type === "product" || type === "collection") && uuidSchema.safeParse(id).success) target = { type, id };
  else return { error: "Pedido inválido." };
  let url: string;
  try {
    url = (await startCheckout(user, target)).redirectUrl;
  } catch (e) {
    if (e instanceof CheckoutError) return { error: e.message };
    console.error("[checkout]", e);
    return { error: "Não foi possível iniciar o pagamento." };
  }
  redirect(url);
}

/** Checkout simulado (somente desenvolvimento). */
export async function simulatePaymentAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar");
  const id = String(form.get("purchaseId") ?? "");
  const outcome = form.get("outcome") === "reject" ? "reject" : "approve";
  if (!uuidSchema.safeParse(id).success) redirect("/lab/compras");
  try {
    await simulatePayment(user, id, outcome);
  } catch (e) {
    if (e instanceof CheckoutError) redirect(`/lab/compras?erro=${e.code}`);
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(`/checkout/retorno?compra=${id}`);
}

export async function updateProfileAction(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/lab/perfil");
  const parsed = profileSchema.safeParse({ displayName: form.get("displayName"), bio: form.get("bio") ?? "" });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Revise os campos destacados." };
  await repo().updateProfile(user.id, { display_name: parsed.data.displayName, bio: parsed.data.bio });
  revalidatePath("/", "layout");
  return { ok: true, message: "Perfil atualizado." };
}

export async function setAutoRenewAction(form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/lab/assinatura");
  const id = String(form.get("subscriptionId") ?? "");
  if (uuidSchema.safeParse(id).success) await repo().setSubscriptionCancelAtPeriodEnd(user.id, id, form.get("cancel") === "1");
  revalidatePath("/lab/assinatura");
  redirect("/lab/assinatura");
}
