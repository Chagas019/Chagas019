import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/payments/mercadopago";
import { createLocalFileToken, resolveSafe, verifyLocalFileToken } from "@/lib/storage";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { safeNext } from "@/lib/utils";

describe("assinatura do webhook Mercado Pago", () => {
  const secret = "segredo-de-teste";
  const ts = String(Date.now());
  const sign = (id: string, req: string, t = ts) => createHmac("sha256", secret).update(`id:${id};request-id:${req};ts:${t};`).digest("hex");
  it("aceita assinatura válida", () => {
    expect(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${sign("123", "req-1")}`, xRequestId: "req-1", dataId: "123" })).toBe(true);
  });
  it("rejeita assinatura de outro id, sem header ou adulterada", () => {
    expect(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=${sign("999", "req-1")}`, xRequestId: "req-1", dataId: "123" })).toBe(false);
    expect(verifyWebhookSignature({ secret, xSignature: null, xRequestId: "req-1", dataId: "123" })).toBe(false);
    expect(verifyWebhookSignature({ secret, xSignature: `ts=${ts},v1=zz`, xRequestId: "req-1", dataId: "123" })).toBe(false);
  });
  it("rejeita notificação antiga (replay)", () => {
    const old = String(Date.now() - 60 * 60 * 1000);
    expect(verifyWebhookSignature({ secret, xSignature: `ts=${old},v1=${sign("123", "req-1", old)}`, xRequestId: "req-1", dataId: "123" })).toBe(false);
  });
});

describe("links de download locais", () => {
  it("token válido funciona; adulterado ou expirado não", () => {
    const t = createLocalFileToken({ path: "demo/a/a.xmp", name: "a.xmp", exp: Date.now() + 60_000 });
    expect(verifyLocalFileToken(t)).toEqual({ path: "demo/a/a.xmp", name: "a.xmp" });
    const [payload, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ path: "demo/b/b.xmp", name: "b", exp: Date.now() + 60_000 })).toString("base64url");
    expect(verifyLocalFileToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyLocalFileToken(`${payload}.x${sig.slice(1)}`)).toBeNull();
    expect(verifyLocalFileToken(createLocalFileToken({ path: "x", name: "x", exp: Date.now() - 1 }))).toBeNull();
  });
  it("bloqueia path traversal", () => {
    expect(resolveSafe("/srv/files", "../etc/passwd")).toBeNull();
    expect(resolveSafe("/srv/files", "/etc/passwd")).toBeNull();
    expect(resolveSafe("/srv/files", "ok/a.xmp")).toBe("/srv/files/ok/a.xmp");
  });
});

describe("senhas e redirecionamentos", () => {
  it("hash scrypt confere só com a senha certa", async () => {
    const h = await hashPassword("senha123");
    expect(await verifyPassword("senha123", h)).toBe(true);
    expect(await verifyPassword("senha124", h)).toBe(false);
  });
  it("safeNext impede open redirect", () => {
    expect(safeNext("/lab/compras")).toBe("/lab/compras");
    expect(safeNext("https://evil.com")).toBe("/lab");
    expect(safeNext("//evil.com")).toBe("/lab");
    expect(safeNext("/\\evil.com")).toBe("/lab");
  });
});
