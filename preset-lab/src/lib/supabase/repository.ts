import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { applyProductQuery } from "@/lib/catalog";
import type { AdminPurchaseRow, FulfillResult, NewPurchase, Repository } from "@/lib/repo/types";
import type { Collection, DashboardStats, Product, ProductQuery, Profile, Purchase, Subscription } from "@/lib/types";
import { createAdminClient, createSessionClient } from "./server";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

function check<T = any>(res: { data: unknown; error: { message: string; code?: string } | null }): T {
  if (res.error) {
    if (res.error.code === "23505") throw new Error("Já existe um registro com esse slug.");
    throw new Error(res.error.message);
  }
  return res.data as T;
}

const toCollection = (r: Row): Collection => {
  const { collection_products, ...rest } = r;
  return {
    ...(rest as Collection),
    product_ids: ((collection_products as Row[]) ?? []).sort((a, b) => a.position - b.position).map((x) => x.product_id),
  };
};
const toPurchase = (r: Row): Purchase => {
  const { purchase_items, ...rest } = r;
  return { ...(rest as Purchase), items: (purchase_items as Purchase["items"]) ?? [] };
};

/**
 * Repositório Supabase.
 *  - leituras públicas, dados do usuário e operações de admin usam o cliente de SESSÃO (RLS aplicada);
 *  - operações que o usuário não pode fazer sozinho (criar compra, confirmar pagamento, registrar
 *    download, ler arquivos privados) usam o cliente SERVICE ROLE, sempre depois da checagem no servidor.
 */
export class SupabaseRepository implements Repository {
  private session(): Promise<SupabaseClient> {
    return createSessionClient();
  }
  private get admin(): SupabaseClient {
    return createAdminClient();
  }

  // ------------------------------------------------------------------ catálogo
  async listCategories() {
    const sb = await this.session();
    return check(await sb.from("categories").select("*").order("sort_order"));
  }
  async listProducts(query: ProductQuery = {}) {
    const sb = await this.session();
    let q = sb.from("products").select("*");
    if (!query.includeUnpublished) q = q.eq("status", "published");
    if (query.ids) q = q.in("id", query.ids.length ? query.ids : ["00000000-0000-0000-0000-000000000000"]);
    if (query.access) q = q.eq("product_type", query.access);
    if (query.featured) q = q.eq("featured", true);
    const rows = check(await q.limit(1000)) as Product[];
    const cats = query.category ? await this.listCategories() : [];
    // busca sem acento, filtro por categoria/tag e ordenação compartilhados com o modo local
    return applyProductQuery(rows, query, new Map(cats.map((c: { slug: string; id: string }) => [c.slug, c.id])));
  }
  async getProductBySlug(slug: string, opts?: { includeUnpublished?: boolean }) {
    const sb = await this.session();
    let q = sb.from("products").select("*").eq("slug", slug);
    if (!opts?.includeUnpublished) q = q.eq("status", "published");
    return check(await q.maybeSingle()) as Product | null;
  }
  async getProductById(id: string, opts?: { includeUnpublished?: boolean }) {
    const sb = await this.session();
    let q = sb.from("products").select("*").eq("id", id);
    if (!opts?.includeUnpublished) q = q.eq("status", "published");
    return check(await q.maybeSingle()) as Product | null;
  }
  async listCollections(opts?: { includeUnpublished?: boolean }) {
    const sb = await this.session();
    let q = sb.from("collections").select("*, collection_products(product_id, position)").order("sort_order");
    if (!opts?.includeUnpublished) q = q.eq("status", "published");
    return (check(await q) as Row[]).map(toCollection);
  }
  async getCollectionBySlug(slug: string) {
    const sb = await this.session();
    const r = check(await sb.from("collections").select("*, collection_products(product_id, position)").eq("slug", slug).eq("status", "published").maybeSingle());
    return r ? toCollection(r) : null;
  }
  async getCollectionById(id: string) {
    const r = check(await this.admin.from("collections").select("*, collection_products(product_id, position)").eq("id", id).maybeSingle());
    return r ? toCollection(r) : null;
  }
  async listInspiration(opts?: { includeUnpublished?: boolean }) {
    const sb = await this.session();
    let q = sb.from("inspiration_posts").select("*").order("sort_order");
    if (!opts?.includeUnpublished) q = q.eq("status", "published");
    return check(await q);
  }
  async listBanners(opts?: { includeInactive?: boolean }) {
    const sb = await this.session();
    let q = sb.from("banners").select("*").order("position");
    if (!opts?.includeInactive) q = q.eq("active", true);
    return check(await q);
  }

  // ------------------------------------------------------------------ arquivos (service role)
  async listProductFiles(productId: string) {
    return check(await this.admin.from("product_files").select("*").eq("product_id", productId).order("format"));
  }
  async getProductFile(fileId: string) {
    return check(await this.admin.from("product_files").select("*").eq("id", fileId).maybeSingle());
  }

  // ------------------------------------------------------------------ favoritos (RLS)
  async listFavoriteIds(userId: string) {
    const sb = await this.session();
    const rows = check(await sb.from("favorites").select("product_id").eq("user_id", userId).order("created_at", { ascending: false })) as Row[];
    return rows.map((r) => r.product_id as string);
  }
  async setFavorite(userId: string, productId: string, on: boolean) {
    const sb = await this.session();
    if (on) check(await sb.from("favorites").upsert({ user_id: userId, product_id: productId }, { onConflict: "user_id,product_id", ignoreDuplicates: true }));
    else check(await sb.from("favorites").delete().eq("user_id", userId).eq("product_id", productId));
  }

  // ------------------------------------------------------------------ comércio (service role)
  async createPurchase(input: NewPurchase) {
    const total = input.items.reduce((s, i) => s + i.unit_price_cents, 0);
    const p = check(
      await this.admin
        .from("purchases")
        .insert({ user_id: input.userId, kind: input.kind, provider: input.provider, is_simulated: input.isSimulated, total_cents: total, status: "pending" })
        .select("*")
        .single()
    ) as Row;
    const items = check(await this.admin.from("purchase_items").insert(input.items.map((i) => ({ ...i, purchase_id: p.id }))).select("*"));
    return { ...(p as Purchase), items } as Purchase;
  }
  async setPurchaseProviderReference(purchaseId: string, reference: string) {
    check(await this.admin.from("purchases").update({ provider_reference: reference }).eq("id", purchaseId));
  }
  async setPurchaseStatus(purchaseId: string, status: "pending" | "failed" | "refunded" | "cancelled") {
    let q = this.admin.from("purchases").update({ status }).eq("id", purchaseId);
    if (status !== "refunded") q = q.neq("status", "paid");
    check(await q);
  }
  async getPurchase(purchaseId: string) {
    const r = check(await this.admin.from("purchases").select("*, purchase_items(*)").eq("id", purchaseId).maybeSingle());
    return r ? toPurchase(r) : null;
  }
  async listPurchases(userId: string) {
    const sb = await this.session();
    return (check(await sb.from("purchases").select("*, purchase_items(*)").eq("user_id", userId).order("created_at", { ascending: false })) as Row[]).map(toPurchase);
  }
  async fulfillPurchase(args: { purchaseId: string; providerPaymentId: string; eventId: string; provider: "mercadopago" | "dev"; payload: unknown }) {
    return check(
      await this.admin.rpc("fulfill_purchase", {
        p_purchase_id: args.purchaseId,
        p_provider_payment_id: args.providerPaymentId,
        p_event_id: args.eventId,
        p_provider: args.provider,
        p_payload: args.payload ?? {},
      })
    ) as FulfillResult;
  }
  async listOwnedProductIds(userId: string) {
    const rows = check(
      await this.admin.from("purchases").select("purchase_items(product_id, collection_id)").eq("user_id", userId).eq("status", "paid")
    ) as Row[];
    const ids = new Set<string>();
    const collections: string[] = [];
    for (const r of rows)
      for (const it of (r.purchase_items as Row[]) ?? []) {
        if (it.product_id) ids.add(it.product_id);
        if (it.collection_id) collections.push(it.collection_id);
      }
    if (collections.length) {
      const cp = check(await this.admin.from("collection_products").select("product_id").in("collection_id", collections)) as Row[];
      cp.forEach((x) => ids.add(x.product_id));
    }
    return [...ids];
  }
  async getActiveSubscription(userId: string) {
    return check(
      await this.admin
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["active", "past_due"])
        .gt("current_period_end", new Date().toISOString())
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle()
    ) as Subscription | null;
  }
  async listSubscriptions(userId: string) {
    const sb = await this.session();
    return check(await sb.from("subscriptions").select("*").eq("user_id", userId).order("created_at", { ascending: false }));
  }
  async setSubscriptionCancelAtPeriodEnd(userId: string, subscriptionId: string, cancel: boolean) {
    const r = check(await this.admin.from("subscriptions").update({ cancel_at_period_end: cancel }).eq("id", subscriptionId).eq("user_id", userId).select("id")) as Row[];
    if (!r.length) throw new Error("Assinatura não encontrada");
  }
  async recordDownload(userId: string, productId: string, fileId: string | null) {
    check(await this.admin.from("downloads").insert({ user_id: userId, product_id: productId, file_id: fileId }));
  }
  async listDownloads(userId: string) {
    const sb = await this.session();
    return check(await sb.from("downloads").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200));
  }
  async rateLimit(key: string, windowSeconds: number, max: number) {
    return check(await this.admin.rpc("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_max: max })) as boolean;
  }

  // ------------------------------------------------------------------ perfis (RLS)
  async getProfile(userId: string) {
    const sb = await this.session();
    return check(await sb.from("profiles").select("*").eq("id", userId).maybeSingle()) as Profile | null;
  }
  async updateProfile(userId: string, data: { display_name: string; bio: string }) {
    const sb = await this.session();
    check(await sb.from("profiles").update(data).eq("id", userId));
  }

  // ------------------------------------------------------------------ admin (RLS: is_admin())
  async adminStats() {
    const sb = await this.session();
    return check(await sb.rpc("admin_dashboard_stats")) as DashboardStats;
  }
  async adminListUsers() {
    const sb = await this.session();
    return check(await sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(1000));
  }
  async adminSetRole(userId: string, role: "user" | "admin") {
    const sb = await this.session();
    check(await sb.from("profiles").update({ role }).eq("id", userId));
  }
  private async emails(ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const sb = await this.session();
    const rows = check(await sb.from("profiles").select("id, email").in("id", [...new Set(ids)])) as Row[];
    return new Map(rows.map((r) => [r.id as string, (r.email as string) ?? "—"]));
  }
  async adminListPurchases(opts?: { userId?: string }): Promise<AdminPurchaseRow[]> {
    const sb = await this.session();
    let q = sb.from("purchases").select("*, purchase_items(*)").order("created_at", { ascending: false }).limit(500);
    if (opts?.userId) q = q.eq("user_id", opts.userId);
    const rows = (check(await q) as Row[]).map(toPurchase);
    const emails = await this.emails(rows.map((r) => r.user_id));
    return rows.map((r) => ({ ...r, user_email: emails.get(r.user_id) ?? "—" }));
  }
  async adminListSubscriptions(opts?: { userId?: string }) {
    const sb = await this.session();
    let q = sb.from("subscriptions").select("*").order("created_at", { ascending: false }).limit(500);
    if (opts?.userId) q = q.eq("user_id", opts.userId);
    const rows = check(await q) as Subscription[];
    const emails = await this.emails(rows.map((r) => r.user_id));
    return rows.map((r) => ({ ...r, user_email: emails.get(r.user_id) ?? "—" }));
  }
  async createProduct(input: Parameters<Repository["createProduct"]>[0]) {
    const sb = await this.session();
    return check(await sb.from("products").insert(input).select("*").single()) as Product;
  }
  async updateProduct(id: string, input: Parameters<Repository["updateProduct"]>[1]) {
    const sb = await this.session();
    return check(await sb.from("products").update(input).eq("id", id).select("*").single()) as Product;
  }
  async deleteProduct(id: string) {
    const sb = await this.session();
    check(await sb.from("products").delete().eq("id", id));
  }
  async addProductFile(file: Parameters<Repository["addProductFile"]>[0]) {
    const sb = await this.session();
    return check(await sb.from("product_files").insert(file).select("*").single());
  }
  async deleteProductFile(id: string) {
    const sb = await this.session();
    const rows = check(await sb.from("product_files").delete().eq("id", id).select("*")) as Row[];
    return (rows[0] as any) ?? null;
  }
  async upsertCategory(input: Parameters<Repository["upsertCategory"]>[0]) {
    const sb = await this.session();
    return check(await sb.from("categories").upsert(input).select("*").single());
  }
  async deleteCategory(id: string) {
    const sb = await this.session();
    check(await sb.from("categories").delete().eq("id", id));
  }
  private async setCollectionProducts(sb: SupabaseClient, id: string, productIds: string[]) {
    check(await sb.from("collection_products").delete().eq("collection_id", id));
    if (productIds.length) check(await sb.from("collection_products").insert(productIds.map((p, i) => ({ collection_id: id, product_id: p, position: i }))));
  }
  async createCollection(input: Parameters<Repository["createCollection"]>[0]) {
    const sb = await this.session();
    const { product_ids, ...row } = input;
    const c = check(await sb.from("collections").insert(row).select("*").single()) as Row;
    await this.setCollectionProducts(sb, c.id, product_ids);
    return { ...(c as Collection), product_ids };
  }
  async updateCollection(id: string, input: Parameters<Repository["updateCollection"]>[1]) {
    const sb = await this.session();
    const { product_ids, ...row } = input;
    const c = check(await sb.from("collections").update(row).eq("id", id).select("*").single()) as Row;
    await this.setCollectionProducts(sb, id, product_ids);
    return { ...(c as Collection), product_ids };
  }
  async deleteCollection(id: string) {
    const sb = await this.session();
    check(await sb.from("collections").delete().eq("id", id));
  }
  async createInspiration(input: Parameters<Repository["createInspiration"]>[0]) {
    const sb = await this.session();
    return check(await sb.from("inspiration_posts").insert(input).select("*").single());
  }
  async updateInspiration(id: string, input: Parameters<Repository["updateInspiration"]>[1]) {
    const sb = await this.session();
    return check(await sb.from("inspiration_posts").update(input).eq("id", id).select("*").single());
  }
  async deleteInspiration(id: string) {
    const sb = await this.session();
    check(await sb.from("inspiration_posts").delete().eq("id", id));
  }
  async createBanner(input: Parameters<Repository["createBanner"]>[0]) {
    const sb = await this.session();
    return check(await sb.from("banners").insert(input).select("*").single());
  }
  async updateBanner(id: string, input: Parameters<Repository["updateBanner"]>[1]) {
    const sb = await this.session();
    return check(await sb.from("banners").update(input).eq("id", id).select("*").single());
  }
  async deleteBanner(id: string) {
    const sb = await this.session();
    check(await sb.from("banners").delete().eq("id", id));
  }
}
