import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/** AES-256-GCM. Formato: `v1.<iv>.<tag>.<ciphertext>` (base64url). */
export function encrypt(plaintext: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Chave de criptografia deve ter 32 bytes.");
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([c.update(plaintext, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(payload: string, key: Buffer): string {
  if (key.length !== 32) throw new Error("Chave de criptografia deve ter 32 bytes.");
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") throw new Error("Payload cifrado inválido.");
  const [, iv, tag, ct] = parts.map((p, i) => (i === 0 ? p : Buffer.from(p, "base64url"))) as [string, Buffer, Buffer, Buffer];
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
