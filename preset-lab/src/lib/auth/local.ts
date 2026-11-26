import "server-only";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { newProfile } from "@/lib/local/repository";
import { now, read, uuid, write } from "@/lib/local/store";
import type { SessionUser } from "@/lib/types";
import { hashPassword, randomToken, sha256, verifyPassword } from "./password";
import { AuthError, type AuthBackend } from "./types";

export const LOCAL_SESSION_COOKIE = "pl_session";
const SESSION_DAYS = 30;

/**
 * Autenticação do MODO LOCAL. Reproduz o fluxo do Supabase Auth:
 * cadastro → e-mail de confirmação → login; recuperação de senha por link.
 * Os e-mails vão para a "caixa de saída" local (/dev/emails).
 */
export class LocalAuth implements AuthBackend {
  async getUser(): Promise<SessionUser | null> {
    const token = (await cookies()).get(LOCAL_SESSION_COOKIE)?.value;
    if (!token) return null;
    const h = sha256(token);
    return read((db) => {
      const s = db.sessions.find((x) => x.token_hash === h && Date.parse(x.expires_at) > Date.now());
      if (!s) return null;
      const u = db.users.find((x) => x.id === s.user_id);
      const profile = db.profiles.find((x) => x.id === s.user_id);
      if (!u || !profile) return null;
      return { id: u.id, email: u.email, emailConfirmed: !!u.email_confirmed_at, profile: structuredClone(profile) };
    });
  }

  async signUp({ email, password, displayName }: { email: string; password: string; displayName: string }) {
    const hash = await hashPassword(password);
    const token = randomToken();
    await write((db) => {
      // não revela se o e-mail já existe (mesmo comportamento do Supabase)
      if (db.users.some((u) => u.email === email)) return;
      const id = uuid();
      db.users.push({ id, email, password_hash: hash, email_confirmed_at: null, created_at: now() });
      db.profiles.push(newProfile(id, email, displayName));
      db.auth_tokens.push({ token_hash: sha256(token), user_id: id, type: "signup", expires_at: new Date(Date.now() + 86400000).toISOString(), used: false });
      const link = `${config.siteUrl}/auth/confirm?type=signup&token=${token}`;
      db.outbox.push({ id: uuid(), to: email, subject: "Confirme seu e-mail — PRESET LAB", body: "Clique no link para confirmar sua conta.", link, created_at: now() });
    });
    return { needsConfirmation: true };
  }

  async signIn({ email, password }: { email: string; password: string }) {
    const user = await read((db) => db.users.find((u) => u.email === email) ?? null);
    // compara mesmo sem usuário para não vazar existência pelo tempo de resposta
    const ok = await verifyPassword(password, user?.password_hash ?? "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
    if (!user || !ok) throw new AuthError("invalid_credentials", "E-mail ou senha incorretos.");
    if (!user.email_confirmed_at) throw new AuthError("email_not_confirmed", "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.");
    await this.startSession(user.id);
  }

  private async startSession(userId: string) {
    const token = randomToken();
    const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
    await write((db) => {
      db.sessions = db.sessions.filter((s) => Date.parse(s.expires_at) > Date.now());
      db.sessions.push({ token_hash: sha256(token), user_id: userId, expires_at: expires.toISOString() });
    });
    (await cookies()).set(LOCAL_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: config.isProd && config.siteUrl.startsWith("https"), path: "/", expires });
  }

  async signOut() {
    const store = await cookies();
    const token = store.get(LOCAL_SESSION_COOKIE)?.value;
    if (token) {
      const h = sha256(token);
      await write((db) => void (db.sessions = db.sessions.filter((s) => s.token_hash !== h)));
    }
    store.delete(LOCAL_SESSION_COOKIE);
  }

  async requestPasswordReset(email: string) {
    const token = randomToken();
    await write((db) => {
      const u = db.users.find((x) => x.email === email);
      if (!u) return; // resposta idêntica para e-mails inexistentes
      db.auth_tokens.push({ token_hash: sha256(token), user_id: u.id, type: "recovery", expires_at: new Date(Date.now() + 3600000).toISOString(), used: false });
      const link = `${config.siteUrl}/auth/confirm?type=recovery&token=${token}`;
      db.outbox.push({ id: uuid(), to: email, subject: "Redefina sua senha — PRESET LAB", body: "Clique no link para criar uma nova senha. Ele vale por 1 hora.", link, created_at: now() });
    });
  }

  async updatePassword(password: string) {
    const user = await this.getUser();
    if (!user) throw new AuthError("not_authenticated", "Sua sessão expirou. Peça um novo link de recuperação.");
    const hash = await hashPassword(password);
    await write((db) => {
      const u = db.users.find((x) => x.id === user.id);
      if (u) u.password_hash = hash;
    });
  }

  async verify(params: URLSearchParams) {
    const token = params.get("token") ?? "";
    const type = params.get("type");
    if (!token || (type !== "signup" && type !== "recovery")) throw new AuthError("invalid_token", "Link inválido.");
    const h = sha256(token);
    const userId = await write((db) => {
      const t = db.auth_tokens.find((x) => x.token_hash === h && x.type === type);
      if (!t || t.used || Date.parse(t.expires_at) < Date.now()) return null;
      t.used = true;
      const u = db.users.find((x) => x.id === t.user_id);
      if (!u) return null;
      u.email_confirmed_at ??= now(); // clicar no link de recuperação também prova posse do e-mail
      return u.id;
    });
    if (!userId) throw new AuthError("invalid_token", "Este link expirou ou já foi usado.");
    await this.startSession(userId);
    return { type: type as "signup" | "recovery" };
  }
}
