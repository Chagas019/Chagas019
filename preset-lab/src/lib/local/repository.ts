import "server-only";
import { applyProductQuery } from "@/lib/catalog";
import type { Repository, FulfillResult, NewPurchase } from "@/lib/repo/types";
import type { Collection, Product, Profile, Subscription } from "@/lib/types";
import { now, read, uuid, write, type LocalDB } from "./store";

const isActiveSub = (s: Subscription) =>
  (s.status === "active" || s.status === "past_due") && !!s.current_period_end && Date.parse(s.current_period_end) > Date.now();

const clone = <T>(v: T): T => structuredClone(v);
const notFound = (what: string) => new Error(`${what} não encontrado`);

function assertUnique<T extends { id: string; slug: string }>(list: T[], slug: string, id?: string) {
  if (list.some((x) => x.slug === slug && x.id !== id)) throw new Error("Já existe um registro com esse slug.");
}

function owned(db: LocalDB, userId: string): Set<string> {
  const ids = new Set<string>();
  for (const p of db.purchases) {
    if (p.user_id !== userId || p.status !== "paid") continue;
    for (const it of p.items) {
      if (it.product_id) ids.add(it.product_id);
      if (it.collection_id) db.collections.find((c) => c.id === it.collection_id)?.product_ids.forEach((id) => ids.add(id));
    }
  }
  return ids;
}

export class LocalRepository implements Repository {
  // ------------------------------------------------------------------ catálogo
  listCategories() {
    return read((db) => clone([...db.categories].sort((a, b) => a.sort_order - b.sort_order)));
  }
  listProducts(query = {}) {
    return read((db) => clone(applyProductQuery(db.products, query, new Map(db.categories.map((c) => [c.slug, c.id])))));
  }
  getProductBySlug(slug: string, opts?: { includeUnpublished?: boolean }) {
    return read((db) => clone(db.products.find((p) => p.slug === slug && (opts?.includeUnpublished || p.status === "published")) ?? null));
  }
  getProductById(id: string, opts?: { includeUnpublished?: boolean }) {
    return read((db) => clone(db.products.find((p) => p.id === id && (opts?.includeUnpublished || p.status === "published")) ?? null));
  }
  listCollections(opts?: { includeUnpublished?: boolean }) {
    return read((db) => clone(db.collections.filter((c) => opts?.includeUnpublished || c.status === "published").sort((a, b) => a.sort_order - b.sort_order)));
  }
  getCollectionBySlug(slug: string) {
    return read((db) => clone(db.collections.find((c) => c.slug === slug && c.status === "published") ?? null));
  }
  getCollectionById(id: string) {
    return read((db) => clone(db.collections.find((c) => c.id === id) ?? null));
  }
  listInspiration(opts?: { includeUnpublished?: boolean }) {
    return read((db) => clone(db.inspiration_posts.filter((p) => opts?.includeUnpublished || p.status === "published").sort((a, b) => a.sort_order - b.sort_order)));
  }
  listBanners(opts?: { includeInactive?: boolean }) {
    return read((db) => clone(db.banners.filter((b) => opts?.includeInactive || b.active).sort((a, b) => a.position - b.position)));
  }

  // ------------------------------------------------------------------ arquivos
  listProductFiles(productId: string) {
    return read((db) => clone(db.product_files.filter((f) => f.product_id === productId)));
  }
  getProductFile(fileId: string) {
    return read((db) => clone(db.product_files.find((f) => f.id === fileId) ?? null));
  }

  // ------------------------------------------------------------------ favoritos
  listFavoriteIds(userId: string) {
    return read((db) =>
      db.favorites
        .filter((f) => f.user_id === userId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map((f) => f.product_id)
    );
  }
  async setFavorite(userId: string, productId: string, on: boolean) {
    await write((db) => {
      const idx = db.favorites.findIndex((f) => f.user_id === userId && f.product_id === productId);
      if (on && idx === -1) {
        if (!db.products.some((p) => p.id === productId)) throw notFound("Produto");
        db.favorites.push({ user_id: userId, product_id: productId, created_at: now() });
      }
      if (!on && idx !== -1) db.favorites.splice(idx, 1);
    });
  }

  // ------------------------------------------------------------------ comércio
  createPurchase(input: NewPurchase) {
    return write((db) => {
      const id = uuid();
      const purchase = {
        id,
        user_id: input.userId,
        status: "pending" as const,
        kind: input.kind,
        total_cents: input.items.reduce((s, i) => s + i.unit_price_cents, 0),
        currency: "BRL" as const,
        provider: input.provider,
        provider_reference: null,
        provider_payment_id: null,
        is_simulated: input.isSimulated,
        created_at: now(),
        paid_at: null,
        items: input.items.map((it) => ({ ...it, id: uuid(), purchase_id: id })),
      };
      db.purchases.push(purchase);
      return clone(purchase);
    });
  }
  async setPurchaseProviderReference(purchaseId: string, reference: string) {
    await write((db) => {
      const p = db.purchases.find((x) => x.id === purchaseId);
      if (p) p.provider_reference = reference;
    });
  }
  async setPurchaseStatus(purchaseId: string, status: "pending" | "failed" | "refunded" | "cancelled") {
    await write((db) => {
      const p = db.purchases.find((x) => x.id === purchaseId);
      if (p && p.status !== "paid") p.status = status;
      if (p && p.status === "paid" && status === "refunded") p.status = "refunded";
    });
  }
  getPurchase(purchaseId: string) {
    return read((db) => clone(db.purchases.find((p) => p.id === purchaseId) ?? null));
  }
  listPurchases(userId: string) {
    return read((db) => clone(db.purchases.filter((p) => p.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))));
  }
  fulfillPurchase(args: { purchaseId: string; providerPaymentId: string; eventId: string; provider: "mercadopago" | "dev"; payload: unknown }) {
    // mesma semântica de public.fulfill_purchase (SQL)
    return write<FulfillResult>((db) => {
      if (db.payment_events.some((e) => e.provider === args.provider && e.event_id === args.eventId)) return "duplicate_event";
      const event = { id: uuid(), provider: args.provider, event_id: args.eventId, payload: args.payload, result: null as string | null, created_at: now() };
      db.payment_events.push(event);
      const p = db.purchases.find((x) => x.id === args.purchaseId);
      if (!p) return (event.result = "purchase_not_found") as FulfillResult;
      if (p.status === "paid") return (event.result = "already_paid") as FulfillResult;
      p.status = "paid";
      p.paid_at = now();
      p.provider_payment_id = args.providerPaymentId;
      if (p.kind === "subscription") {
        // período pré-pago; renovar soma ao fim do período vigente
        const base = Math.max(Date.now(), ...db.subscriptions.filter((s) => s.user_id === p.user_id && isActiveSub(s)).map((s) => Date.parse(s.current_period_end!)));
        for (const it of p.items) {
          if (!it.plan) continue;
          const end = new Date(base);
          if (it.plan === "premium_yearly") end.setFullYear(end.getFullYear() + 1);
          else end.setMonth(end.getMonth() + 1);
          const ref = `purchase:${p.id}`;
          const existing = db.subscriptions.find((s) => s.provider === p.provider && s.provider_subscription_id === ref);
          if (existing) Object.assign(existing, { status: "active", current_period_end: end.toISOString() });
          else
            db.subscriptions.push({ id: uuid(), user_id: p.user_id, plan: it.plan, status: "active", current_period_end: end.toISOString(), cancel_at_period_end: false, provider: p.provider, provider_subscription_id: ref, is_simulated: p.is_simulated, created_at: now() });
        }
      }
      return (event.result = "fulfilled") as FulfillResult;
    });
  }
  listOwnedProductIds(userId: string) {
    return read((db) => [...owned(db, userId)]);
  }
  getActiveSubscription(userId: string) {
    return read((db) => clone(db.subscriptions.filter((s) => s.user_id === userId && isActiveSub(s)).sort((a, b) => (b.current_period_end ?? "").localeCompare(a.current_period_end ?? ""))[0] ?? null));
  }
  listSubscriptions(userId: string) {
    return read((db) => clone(db.subscriptions.filter((s) => s.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))));
  }
  async setSubscriptionCancelAtPeriodEnd(userId: string, subscriptionId: string, cancel: boolean) {
    await write((db) => {
      const s = db.subscriptions.find((x) => x.id === subscriptionId && x.user_id === userId);
      if (!s) throw notFound("Assinatura");
      s.cancel_at_period_end = cancel;
    });
  }
  async recordDownload(userId: string, productId: string, fileId: string | null) {
    await write((db) => {
      db.downloads.push({ id: uuid(), user_id: userId, product_id: productId, file_id: fileId, created_at: now() });
      const p = db.products.find((x) => x.id === productId);
      if (p) p.downloads_count += 1;
    });
  }
  listDownloads(userId: string) {
    return read((db) => clone(db.downloads.filter((d) => d.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at))));
  }
  rateLimit(key: string, windowSeconds: number, max: number) {
    return write((db) => {
      const t = Date.now();
      const r = db.rate_limits[key];
      if (!r || r.window_start < t - windowSeconds * 1000) db.rate_limits[key] = { window_start: t, hits: 1 };
      else r.hits += 1;
      return db.rate_limits[key].hits <= max;
    });
  }

  // ------------------------------------------------------------------ perfis
  getProfile(userId: string) {
    return read((db) => clone(db.profiles.find((p) => p.id === userId) ?? null));
  }
  async updateProfile(userId: string, data: { display_name: string; bio: string }) {
    await write((db) => {
      const p = db.profiles.find((x) => x.id === userId);
      if (!p) throw notFound("Perfil");
      p.display_name = data.display_name;
      p.bio = data.bio;
    });
  }

  // ------------------------------------------------------------------ admin
  adminStats() {
    return read((db) => {
      const paid = db.purchases.filter((p) => p.status === "paid");
      const real = paid.filter((p) => !p.is_simulated);
      return {
        users: db.profiles.length,
        products: db.products.length,
        published_products: db.products.filter((p) => p.status === "published").length,
        downloads: db.downloads.length,
        paid_orders: real.length,
        revenue_cents: real.reduce((s, p) => s + p.total_cents, 0),
        simulated_orders: paid.length - real.length,
        active_subscriptions: db.subscriptions.filter((s) => s.status === "active" && isActiveSub(s)).length,
      };
    });
  }
  adminListUsers() {
    return read((db) => clone([...db.profiles].sort((a, b) => b.created_at.localeCompare(a.created_at))));
  }
  async adminSetRole(userId: string, role: "user" | "admin") {
    await write((db) => {
      const p = db.profiles.find((x) => x.id === userId);
      if (!p) throw notFound("Usuário");
      p.role = role;
    });
  }
  adminListPurchases(opts?: { userId?: string }) {
    return read((db) =>
      clone(
        db.purchases
          .filter((p) => !opts?.userId || p.user_id === opts.userId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((p) => ({ ...p, user_email: db.profiles.find((u) => u.id === p.user_id)?.email ?? "—" }))
      )
    );
  }
  adminListSubscriptions(opts?: { userId?: string }) {
    return read((db) =>
      clone(
        db.subscriptions
          .filter((s) => !opts?.userId || s.user_id === opts.userId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((s) => ({ ...s, user_email: db.profiles.find((u) => u.id === s.user_id)?.email ?? "—" }))
      )
    );
  }
  createProduct(input: Parameters<Repository["createProduct"]>[0]) {
    return write((db) => {
      assertUnique(db.products, input.slug);
      const t = now();
      const p: Product = { ...input, id: uuid(), currency: "BRL", downloads_count: 0, is_demo: false, created_at: t, updated_at: t, published_at: input.status === "published" ? t : null };
      db.products.push(p);
      return clone(p);
    });
  }
  updateProduct(id: string, input: Parameters<Repository["updateProduct"]>[1]) {
    return write((db) => {
      const p = db.products.find((x) => x.id === id);
      if (!p) throw notFound("Produto");
      if (input.slug) assertUnique(db.products, input.slug, id);
      Object.assign(p, input, { updated_at: now() });
      if (p.status === "published" && !p.published_at) p.published_at = now();
      return clone(p);
    });
  }
  async deleteProduct(id: string) {
    await write((db) => {
      db.products = db.products.filter((p) => p.id !== id);
      db.product_files = db.product_files.filter((f) => f.product_id !== id);
      db.favorites = db.favorites.filter((f) => f.product_id !== id);
      db.downloads = db.downloads.filter((d) => d.product_id !== id);
      db.collections.forEach((c) => (c.product_ids = c.product_ids.filter((x) => x !== id)));
      db.purchases.forEach((p) => p.items.forEach((it) => it.product_id === id && (it.product_id = null)));
    });
  }
  addProductFile(file: Parameters<Repository["addProductFile"]>[0]) {
    return write((db) => {
      const f = { ...file, id: uuid(), created_at: now() };
      db.product_files.push(f);
      return clone(f);
    });
  }
  deleteProductFile(id: string) {
    return write((db) => {
      const f = db.product_files.find((x) => x.id === id) ?? null;
      db.product_files = db.product_files.filter((x) => x.id !== id);
      return f;
    });
  }
  upsertCategory(input: Parameters<Repository["upsertCategory"]>[0]) {
    return write((db) => {
      assertUnique(db.categories, input.slug, input.id);
      const existing = input.id ? db.categories.find((c) => c.id === input.id) : undefined;
      if (existing) {
        Object.assign(existing, input);
        return clone(existing);
      }
      const c = { ...input, id: uuid() };
      db.categories.push(c);
      return clone(c);
    });
  }
  async deleteCategory(id: string) {
    await write((db) => {
      db.categories = db.categories.filter((c) => c.id !== id);
      db.products.forEach((p) => p.category_id === id && (p.category_id = null));
    });
  }
  createCollection(input: Parameters<Repository["createCollection"]>[0]) {
    return write((db) => {
      assertUnique(db.collections, input.slug);
      const c: Collection = { ...input, id: uuid(), is_demo: false };
      db.collections.push(c);
      return clone(c);
    });
  }
  updateCollection(id: string, input: Parameters<Repository["updateCollection"]>[1]) {
    return write((db) => {
      const c = db.collections.find((x) => x.id === id);
      if (!c) throw notFound("Coleção");
      assertUnique(db.collections, input.slug, id);
      Object.assign(c, input);
      return clone(c);
    });
  }
  async deleteCollection(id: string) {
    await write((db) => {
      db.collections = db.collections.filter((c) => c.id !== id);
      db.purchases.forEach((p) => p.items.forEach((it) => it.collection_id === id && (it.collection_id = null)));
    });
  }
  createInspiration(input: Parameters<Repository["createInspiration"]>[0]) {
    return write((db) => {
      assertUnique(db.inspiration_posts, input.slug);
      const p = { ...input, id: uuid(), is_demo: false };
      db.inspiration_posts.push(p);
      return clone(p);
    });
  }
  updateInspiration(id: string, input: Parameters<Repository["updateInspiration"]>[1]) {
    return write((db) => {
      const p = db.inspiration_posts.find((x) => x.id === id);
      if (!p) throw notFound("Inspiração");
      assertUnique(db.inspiration_posts, input.slug, id);
      Object.assign(p, input);
      return clone(p);
    });
  }
  async deleteInspiration(id: string) {
    await write((db) => void (db.inspiration_posts = db.inspiration_posts.filter((p) => p.id !== id)));
  }
  createBanner(input: Parameters<Repository["createBanner"]>[0]) {
    return write((db) => {
      const b = { ...input, id: uuid() };
      db.banners.push(b);
      return clone(b);
    });
  }
  updateBanner(id: string, input: Parameters<Repository["updateBanner"]>[1]) {
    return write((db) => {
      const b = db.banners.find((x) => x.id === id);
      if (!b) throw notFound("Banner");
      Object.assign(b, input);
      return clone(b);
    });
  }
  async deleteBanner(id: string) {
    await write((db) => void (db.banners = db.banners.filter((b) => b.id !== id)));
  }
}

/** Usado pela autenticação local para criar o perfil junto com o usuário. */
export function newProfile(id: string, email: string, displayName: string): Profile {
  return { id, email, display_name: displayName.slice(0, 80), bio: "", avatar_url: null, role: "user", created_at: now() };
}
