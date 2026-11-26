import type { SessionUser } from "@/lib/types";

export class AuthError extends Error {
  constructor(
    public code: "invalid_credentials" | "email_not_confirmed" | "weak_password" | "rate_limited" | "invalid_token" | "not_authenticated" | "unknown",
    message: string
  ) {
    super(message);
  }
}

export interface AuthBackend {
  getUser(): Promise<SessionUser | null>;
  signUp(input: { email: string; password: string; displayName: string }): Promise<{ needsConfirmation: boolean }>;
  signIn(input: { email: string; password: string }): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  updatePassword(password: string): Promise<void>;
  /** Processa links de confirmação/recuperação. Retorna o tipo verificado. */
  verify(params: URLSearchParams): Promise<{ type: "signup" | "recovery" | "magiclink" | "email_change" | "unknown" }>;
}
