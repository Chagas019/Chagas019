import { createHash, timingSafeEqual } from "node:crypto";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from "jose";
import type { Config } from "./config.js";

export interface AuthUser { userId: string; email?: string }

export const DEV_USER_ID = "dev-user";

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Cria o verificador de Bearer. Retorna null se inválido (nunca lança).
 * JWT Supabase: HS256 (SUPABASE_JWT_SECRET) ou assimétrico via JWKS remoto (SUPABASE_URL).
 */
export function createAuthenticator(config: Pick<Config, "supabaseUrl" | "supabaseJwtSecret" | "devToken" | "isProduction"> & { devTokenAllowed?: boolean; ownerToken?: string; ownerId?: string }) {
  const secret = config.supabaseJwtSecret ? new TextEncoder().encode(config.supabaseJwtSecret) : undefined;
  let jwks: JWTVerifyGetKey | undefined;
  if (config.supabaseUrl) {
    jwks = createRemoteJWKSet(new URL("/auth/v1/.well-known/jwks.json", config.supabaseUrl));
  }
  // Token de dev só com NODE_ENV explicitamente development/test (devTokenAllowed); nunca em produção.
  const devEnabled = !!config.devToken && !config.isProduction && (config.devTokenAllowed ?? true);
  const issuer = config.supabaseUrl ? `${config.supabaseUrl.replace(/\/+$/, "")}/auth/v1` : undefined;

  return async function authenticate(authorization: string | undefined): Promise<AuthUser | null> {
    if (!authorization) return null;
    const m = /^Bearer\s+(\S+)$/i.exec(authorization.trim());
    if (!m) return null;
    const token = m[1]!;

    if (devEnabled && safeEqual(token, config.devToken!)) return { userId: DEV_USER_ID };
    // Modo pessoal (um único dono): token estático longo, válido também em produção.
    if (config.ownerToken && safeEqual(token, config.ownerToken)) return { userId: config.ownerId ?? "owner" };

    try {
      const { alg } = decodeProtectedHeader(token);
      const opts = { audience: "authenticated" as const, ...(issuer ? { issuer } : {}) };
      let payload;
      if (alg === "HS256") {
        if (!secret) return null;
        ({ payload } = await jwtVerify(token, secret, { ...opts, algorithms: ["HS256"] }));
      } else {
        if (!jwks) return null;
        ({ payload } = await jwtVerify(token, jwks, { ...opts, algorithms: ["ES256", "RS256", "EdDSA"] }));
      }
      if (typeof payload.sub !== "string" || !payload.sub) return null;
      if (payload.exp === undefined) return null;
      return { userId: payload.sub, email: typeof payload.email === "string" ? payload.email : undefined };
    } catch {
      return null;
    }
  };
}
