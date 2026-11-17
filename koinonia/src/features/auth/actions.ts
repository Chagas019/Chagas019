"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/i18n/server";
import { forgotSchema, loginSchema, resetSchema, signupSchema } from "@/schemas/auth";
import { formToObject } from "@/schemas/common";
import { validationError } from "@/lib/errors";
import { publicEnv } from "@/lib/env";
import { safeRedirectPath } from "@/lib/utils";
import type { ActionState } from "@/lib/action-state";

async function siteOrigin(): Promise<string> {
  // Usa a URL configurada; o host da requisição só é aceito em desenvolvimento.
  if (process.env.NODE_ENV !== "production") {
    const h = await headers();
    const host = h.get("host");
    if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  }
  return publicEnv.siteUrl;
}

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const raw = formToObject(form);
  const parsed = loginSchema.safeParse(raw);
  const values = { email: String(raw.email ?? "") };
  if (!parsed.success) return validationError(parsed.error, m, values);

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: m.errors.unavailable, values };
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed" ? m.errors.emailNotConfirmed
      : error.status === 429 ? m.errors.rateLimited
      : m.errors.invalidCredentials; // mensagem genérica: não revela se o e-mail existe
    return { status: "error", message, values };
  }
  redirect(safeRedirectPath(form.get("next")));
}

export async function signupAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m, locale } = await getI18n();
  const raw = formToObject(form);
  const values = { email: String(raw.email ?? ""), displayName: String(raw.displayName ?? "") };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return validationError(parsed.error, m, values);

  const supabase = await createClient();
  if (!supabase) return { status: "error", message: m.errors.unavailable, values };
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/onboarding`,
      data: { display_name: parsed.data.displayName, locale, consent_version: "2026-11" },
    },
  });
  if (error) {
    const message =
      error.code === "weak_password" ? m.errors.weakPassword
      : error.code === "user_already_exists" ? m.errors.userExists
      : error.status === 429 ? m.errors.rateLimited
      : m.errors.generic;
    return { status: "error", message, values };
  }
  if (data.session) redirect("/onboarding"); // projetos sem confirmação de e-mail
  return { status: "success", message: m.auth.checkEmailBody.replace("{email}", parsed.data.email) };
}

export async function forgotPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const parsed = forgotSchema.safeParse(formToObject(form));
  if (!parsed.success) return validationError(parsed.error, m);
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: m.errors.unavailable };
  const origin = await siteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/redefinir-senha`,
  });
  if (error?.status === 429) return { status: "error", message: m.errors.rateLimited };
  // Sempre a mesma resposta: evita enumeração de contas.
  return { status: "success", message: m.auth.forgotSent };
}

export async function resetPasswordAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { m } = await getI18n();
  const parsed = resetSchema.safeParse(formToObject(form));
  if (!parsed.success) return validationError(parsed.error, m);
  const supabase = await createClient();
  if (!supabase) return { status: "error", message: m.errors.unavailable };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { status: "error", message: m.auth.linkInvalid };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: error.code === "weak_password" || error.code === "same_password" ? m.errors.weakPassword : m.errors.generic };
  return { status: "success", message: m.auth.resetDone };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  redirect("/");
}
