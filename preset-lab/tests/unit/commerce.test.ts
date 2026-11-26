import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { SessionUser } from "@/lib/types";

// integração com o repositório LOCAL (mesma semântica do SQL fulfill_purchase)
const dir = mkdtempSync(path.join(tmpdir(), "presetlab-test-"));
process.env.LOCAL_DATA_DIR = dir;
process.env.DATA_BACKEND = "local";
process.env.PAYMENTS_PROVIDER = "dev";

const { repo } = await import("@/lib/repo");
const { startCheckout, simulatePayment, CheckoutError } = await import("@/lib/services/checkout");
const { authorizeDownload, DownloadError } = await import("@/lib/services/downloads");
const { write } = await import("@/lib/local/store");
const { newProfile } = await import("@/lib/local/repository");

const mkUser = async (id: string, role: "user" | "admin" = "user"): Promise<SessionUser> => {
  const profile = { ...newProfile(id, `${id}@example.com`, id), role };
  await write((db) => void db.profiles.push(profile));
  return { id, email: profile.email, emailConfirmed: true, profile };
};

let ana: SessionUser;
let bia: SessionUser;
beforeAll(async () => {
  ana = await mkUser("00000000-0000-4000-8000-00000000000a");
  bia = await mkUser("00000000-0000-4000-8000-00000000000b");
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const product = async (slug: string) => (await repo().getProductBySlug(slug))!;
const fileOf = async (slug: string) => (await repo().listProductFiles((await product(slug)).id))[0];

describe("checkout + downloads", () => {
  it("bloqueia download premium antes da compra", async () => {
    const f = await fileOf("neon-noir");
    await expect(authorizeDownload(ana, f.id)).rejects.toMatchObject({ code: "forbidden", reason: "purchase_or_subscription_required" });
    await expect(authorizeDownload(null, f.id)).rejects.toBeInstanceOf(DownloadError);
  });

  it("preço vem do servidor e compra duplicada reaproveita o pedido pendente", async () => {
    const p = await product("neon-noir");
    const a = await startCheckout(ana, { type: "product", id: p.id });
    const b = await startCheckout(ana, { type: "product", id: p.id });
    expect(a.purchase.total_cents).toBe(p.price_cents);
    expect(b.purchase.id).toBe(a.purchase.id);
    expect(a.redirectUrl).toBe(`/checkout/simulado/${a.purchase.id}`);
  });

  it("pagamento confirmado libera o download com URL temporária e é idempotente", async () => {
    const p = await product("neon-noir");
    const { purchase } = await startCheckout(ana, { type: "product", id: p.id });
    expect(await simulatePayment(ana, purchase.id, "approve")).toBe("fulfilled");
    expect(await simulatePayment(ana, purchase.id, "approve")).toBe("duplicate_event");
    const f = await fileOf("neon-noir");
    const { url } = await authorizeDownload(ana, f.id);
    expect(url).toMatch(/^\/api\/files\/.+\..+/);
    expect((await repo().getProductById(p.id))!.downloads_count).toBe(1);
    await expect(startCheckout(ana, { type: "product", id: p.id })).rejects.toMatchObject({ code: "already_owned" });
  });

  it("outro usuário não paga nem baixa a compra alheia", async () => {
    const p = await product("teal-coast");
    const { purchase } = await startCheckout(ana, { type: "product", id: p.id });
    await expect(simulatePayment(bia, purchase.id, "approve")).rejects.toBeInstanceOf(CheckoutError);
    await expect(authorizeDownload(bia, (await fileOf("neon-noir")).id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("gratuito não é vendido; exclusivo do Club não é vendido avulso", async () => {
    await expect(startCheckout(ana, { type: "product", id: (await product("golden-dunes")).id })).rejects.toMatchObject({ code: "not_for_sale" });
    await expect(startCheckout(ana, { type: "product", id: (await product("fog-ritual")).id })).rejects.toMatchObject({ code: "not_for_sale" });
  });

  it("assinatura libera exclusivos e renovação soma ao período", async () => {
    const fog = await fileOf("fog-ritual");
    await expect(authorizeDownload(bia, fog.id)).rejects.toMatchObject({ reason: "subscription_required" });
    const first = await startCheckout(bia, { type: "plan", plan: "premium_monthly" });
    await simulatePayment(bia, first.purchase.id, "approve");
    const sub1 = (await repo().getActiveSubscription(bia.id))!;
    expect((await authorizeDownload(bia, fog.id)).url).toBeTruthy();
    const golden = await fileOf("golden-vows"); // purchase_only
    await expect(authorizeDownload(bia, golden.id)).rejects.toMatchObject({ reason: "purchase_required" });
    const renew = await startCheckout(bia, { type: "plan", plan: "premium_monthly" });
    await simulatePayment(bia, renew.purchase.id, "approve");
    const sub2 = (await repo().getActiveSubscription(bia.id))!;
    expect(Date.parse(sub2.current_period_end!)).toBeGreaterThan(Date.parse(sub1.current_period_end!) + 20 * 86400000);
  });

  it("coleção comprada libera todos os presets dela", async () => {
    const c = (await repo().getCollectionBySlug("luz-dourada"))!;
    const { purchase } = await startCheckout(ana, { type: "collection", id: c.id });
    expect(purchase.total_cents).toBe(c.price_cents);
    await simulatePayment(ana, purchase.id, "approve");
    expect((await authorizeDownload(ana, (await fileOf("golden-vows")).id)).url).toBeTruthy();
  });

  it("pagamento recusado não libera nada", async () => {
    const caio = await mkUser("00000000-0000-4000-8000-00000000000c");
    const p = await product("window-light");
    const { purchase } = await startCheckout(caio, { type: "product", id: p.id });
    expect(await simulatePayment(caio, purchase.id, "reject")).toBe("failed");
    expect((await repo().getPurchase(purchase.id))!.status).toBe("failed");
    await expect(authorizeDownload(caio, (await fileOf("window-light")).id)).rejects.toMatchObject({ code: "forbidden" });
  });

  it("estatísticas separam vendas simuladas de receita real", async () => {
    const s = await repo().adminStats();
    expect(s.paid_orders).toBe(0);
    expect(s.revenue_cents).toBe(0);
    expect(s.simulated_orders).toBeGreaterThanOrEqual(4);
  });
});
