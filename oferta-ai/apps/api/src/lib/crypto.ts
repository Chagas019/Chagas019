import crypto from "node:crypto";

/** Criptografia AES-256-GCM para credenciais sensíveis armazenadas no banco. */
function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY ?? "";
  const buf = Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("ENCRYPTION_KEY deve ser 32 bytes em base64 (openssl rand -base64 32)");
  return buf;
}

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [v, ivB, tagB, dataB] = payload.split(":");
  if (v !== "v1" || !ivB || !tagB || !dataB) throw new Error("payload criptografado inválido");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]).toString("utf8");
}

export function encryptJson(obj: Record<string, string>): string {
  return encrypt(JSON.stringify(obj));
}

export function decryptJson<T = Record<string, string>>(payload: string | null | undefined): T | null {
  if (!payload) return null;
  return JSON.parse(decrypt(payload)) as T;
}

/** Mostra apenas os 4 últimos caracteres de um segredo. */
export function mask(secret: string | undefined | null): string | null {
  if (!secret) return null;
  if (secret.length <= 6) return "••••";
  return `••••${secret.slice(-4)}`;
}

export function sha256(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}
