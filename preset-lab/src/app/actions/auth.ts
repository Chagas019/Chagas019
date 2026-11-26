"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/forms/form-message";
import { auth, AuthError } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { clientKey } from "@/lib/request";
import { safeNext } from "@/lib/utils";
import { fieldErrors, newPasswordSchema, resetRequestSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";

const limited = async (scope: string, max: number, windowSec = 600) => !(await repo().rateLimit(`${scope}:${await clientKey()}`, windowSec, max));
const tooMany: ActionState = { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

export async function signUpAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({ displayName: form.get("displayName"), email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Revise os campos destacados." };
  if (await limited("signup", 5)) return tooMany;
  try {
    const { needsConfirmation } = await auth().signUp(parsed.data);
    if (!needsConfirmation) redirect("/lab");
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  redirect(`/cadastro/confirme?email=${encodeURIComponent(parsed.data.email)}`);
}

export async function signInAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Revise os campos destacados." };
  if (await limited("signin", 10)) return tooMany;
  try {
    await auth().signIn(parsed.data);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  revalidatePath("/", "layout");
  redirect(safeNext(form.get("next")));
}

export async function signOutAction() {
  await auth().signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

export async function requestResetAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = resetRequestSchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error) };
  if (await limited("reset", 5)) return tooMany;
  try {
    await auth().requestPasswordReset(parsed.data.email);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  return { ok: true, message: "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha. Ele vale por 1 hora." };
}

export async function updatePasswordAction(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = newPasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), error: "Revise os campos destacados." };
  try {
    await auth().updatePassword(parsed.data.password);
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  redirect("/lab?senha=atualizada");
}
