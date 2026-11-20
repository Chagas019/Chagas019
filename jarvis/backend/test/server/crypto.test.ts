import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decrypt, encrypt } from "../../src/server/crypto.js";

describe("crypto", () => {
  const key = randomBytes(32);
  it("roundtrip", () => {
    const s = '{"refresh_token":"abc ção"}';
    const c = encrypt(s, key);
    expect(c).not.toContain("abc");
    expect(decrypt(c, key)).toBe(s);
  });
  it("IV aleatório", () => expect(encrypt("a", key)).not.toBe(encrypt("a", key)));
  it("chave errada ou adulteração falha", () => {
    const c = encrypt("segredo", key);
    expect(() => decrypt(c, randomBytes(32))).toThrow();
    const parts = c.split(".");
    parts[3] = Buffer.from("xx").toString("base64url");
    expect(() => decrypt(parts.join("."), key)).toThrow();
    expect(() => decrypt("lixo", key)).toThrow();
  });
  it("chave inválida", () => expect(() => encrypt("a", Buffer.alloc(16))).toThrow());
});
