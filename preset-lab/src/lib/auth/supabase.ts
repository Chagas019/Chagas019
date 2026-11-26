import "server-only";
import type { EmailOtpType } from "@supabase/supabase-js";
import { config } from "@/lib/config";
import { createSessionClient } from "@/lib/supabase/server";
import type { Profile, SessionUser } from "@/lib/types";
import { AuthError, type AuthBackend } from "./types";

function mapError(e: { message: string; code?: string; status?: number }): AuthError {
  const code = e.code ?? "";
  if (code === "invalid_credentials" || /invalid login/i.test(e.message)) return new AuthError("invalid_credentials", "E-mail ou senha incorretos.");
  if (code === "email_not_confirmed" || /not confirmed/i.test(e.message)) return new AuthError("email_not_confirmed", "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
  if (code === "weak_password") return new AuthError("weak_password", "Senha fraca. Use pelo menos 8 caracteres com letras e números.");
  if (e.status === 429 || code === "over_request_rate_limit" || code === "over_email_send_rate_limit") return new AuthError("rate_limited", "Muitas tentativas. Aguarde alguns minutos.");
  if (code === "otp_expired" || /expired|invalid/i.test(e.message)) return new AuthError("invalid_token", "Este link expirou ou já foi usado.");
  return new AuthError("unknown", "Não foi possível concluir. Tente novamente.");
}

/** Supabase Auth (produção). */
export class SupabaseAuth implements AuthBackend {
  async getUser(): Promise<SessionUser | null> {
    const sb = await createSessionClient();
    const { data } = await sb.auth.getUser(); // valida o JWT no servidor do Supabase
    if (!data.user) return null;
    const { data: profile } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    const p: Profile = (profile as Profile) ?? { id: data.user.id, email: data.user.email ?? "", display_name: "", bio: "", avatar_url: null, role: "user", created_at: data.user.created_at };
    return { id: data.user.id, email: data.user.email ?? "", emailConfirmed: !!data.user.email_confirmed_at, profile: p };
  }

  async signUp({ email, password, displayName }: { email: string; password: string; displayName: string }) {
    const sb = await createSessionClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${config.siteUrl}/auth/confirm?next=/lab`, data: { display_name: displayName } },
    });
    if (error) throw mapError(error);
    return { needsConfirmation: !data.session };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    const sb = await createSessionClient();
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw mapError(error);
  }

  async signOut() {
    const sb = await createSessionClient();
    await sb.auth.signOut();
  }

  async requestPasswordReset(email: string) {
    const sb = await createSessionClient();
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${config.siteUrl}/auth/confirm?next=/redefinir-senha` });
    if (error && error.status === 429) throw mapError(error);
    // demais erros são silenciados para não revelar se o e-mail existe
  }

  async updatePassword(password: string) {
    const sb = await createSessionClient();
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error.status === 401 ? new AuthError("not_authenticated", "Sua sessão expirou. Peça um novo link de recuperação.") : mapError(error);
  }

  async verify(params: URLSearchParams) {
    const sb = await createSessionClient();
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = (params.get("type") as EmailOtpType | null) ?? null;
    if (code) {
      const { error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw mapError(error);
      return { type: params.get("next") === "/redefinir-senha" ? ("recovery" as const) : ("signup" as const) };
    }
    if (tokenHash && type) {
      const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
      if (error) throw mapError(error);
      return { type: type === "recovery" ? ("recovery" as const) : type === "email_change" ? ("email_change" as const) : ("signup" as const) };
    }
    throw new AuthError("invalid_token", "Link inválido.");
  }
}
