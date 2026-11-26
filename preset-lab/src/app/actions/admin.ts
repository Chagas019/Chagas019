"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionState } from "@/components/forms/form-message";
import { requireAdmin } from "@/lib/auth";
import { repo } from "@/lib/repo";
import { storage } from "@/lib/storage";
import type { AccessMode, FileFormat, ProductInput } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { fieldErrors, uuidSchema } from "@/lib/validation/schemas";

/* ============================================================================
   Admin Studio — server actions
   Toda action começa com requireAdmin() (verificação no servidor) e valida
   os dados com zod antes de gravar, espelhando as restrições do banco.
   ========================================================================== */

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const FILE_FORMATS = ["dng", "xmp", "zip", "cube", "3dl"] as const;
const MEDIA_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX_PRIVATE = 100 * 1024 * 1024;
const MAX_MEDIA = 10 * 1024 * 1024;

// ------------------------------------------------------------------ helpers de FormData
const str = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const list = (f: FormData, k: string) =>
  f
    .getAll(k)
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
const csv = (s: string) =>
  [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];

/** "29,90" | "29.90" | "R$ 1.299,00" → centavos (null = inválido). */
function parsePriceCents(raw: string): number | null {
  let s = raw.replace(/R\$|\s/gi, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}

const fail = (e: unknown, fallback: string): ActionState => {
  const msg = e instanceof Error ? e.message : "";
  if (/slug/i.test(msg)) return { error: msg, fieldErrors: { slug: "Esse slug já está em uso." } };
  if (/42501|próprio acesso|apenas administradores/i.test(msg)) return { error: "Operação não permitida pelo banco: um administrador não pode remover o próprio acesso." };
  if (/violates check constraint/i.test(msg)) return { error: `O banco recusou os dados: ${msg}` };
  console.error("[admin]", e);
  return { error: msg ? `${fallback} (${msg})` : fallback };
};

const imageUrl = z
  .string()
  .trim()
  .max(1000, "URL muito longa.")
  .refine((v) => v === "" || (v.startsWith("/") && !v.startsWith("//")) || /^https:\/\/[^\s]+$/.test(v), "Use um caminho interno (/...) ou uma URL https://.")
  .transform((v) => (v === "" ? null : v));

const slugField = z.string().max(80, "Slug muito longo.").regex(SLUG_RE, "Use apenas letras minúsculas, números e hífens (ex.: neon-noir).");

function revalidateCatalog() {
  revalidatePath("/", "layout");
}

// ============================================================================
// Uploads
// ============================================================================

export type PrepareUploadResult =
  | { ok: true; kind: "supabase"; signedUrl: string; path: string; publicUrl?: string }
  | { ok: true; kind: "local"; path: string; publicUrl?: string }
  | { ok: false; error: string };

function sanitizeName(name: string) {
  const base = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const ext = base.split(".").pop() ?? "";
  const stem = base
    .slice(0, base.length - ext.length - 1)
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 60);
  return `${stem || "arquivo"}.${ext}`;
}

function extOf(name: string) {
  return (name.split(".").pop() ?? "").toLowerCase();
}

/** Valida o pedido de upload, gera o caminho NO SERVIDOR e prepara o destino. */
export async function prepareUploadAction(target: "private" | "media", fileName: string, size: number, contentType: string, productId?: string): Promise<PrepareUploadResult> {
  await requireAdmin();
  if (target !== "private" && target !== "media") return { ok: false, error: "Destino inválido." };
  if (typeof fileName !== "string" || !fileName || fileName.length > 200) return { ok: false, error: "Nome de arquivo inválido." };
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return { ok: false, error: "Arquivo vazio." };

  let path: string;
  if (target === "private") {
    if (size > MAX_PRIVATE) return { ok: false, error: "Arquivo maior que 100 MB." };
    const ext = extOf(fileName);
    if (!(FILE_FORMATS as readonly string[]).includes(ext)) return { ok: false, error: "Formato não aceito. Use .xmp, .dng, .zip, .cube ou .3dl." };
    if (!productId || !uuidSchema.safeParse(productId).success) return { ok: false, error: "Produto inválido." };
    const product = await repo().getProductById(productId, { includeUnpublished: true });
    if (!product) return { ok: false, error: "Produto não encontrado." };
    path = `products/${productId}/${randomUUID()}-${sanitizeName(fileName)}`;
  } else {
    if (size > MAX_MEDIA) return { ok: false, error: "Imagem maior que 10 MB." };
    const ext = MEDIA_TYPES[contentType];
    if (!ext) return { ok: false, error: "Tipo de imagem não aceito. Use JPEG, PNG, WebP ou AVIF." };
    path = `media/${new Date().getUTCFullYear()}/${randomUUID()}.${ext}`;
  }

  try {
    const s = storage();
    const up = await s.createSignedUpload(target, path);
    const publicUrl = target === "media" ? s.mediaUrl(path) : undefined;
    if (up.kind === "supabase") return { ok: true, kind: "supabase", signedUrl: up.signedUrl, path: up.path, publicUrl };
    return { ok: true, kind: "local", path: up.path, publicUrl };
  } catch (e) {
    console.error("[admin] prepareUpload", e);
    return { ok: false, error: "Não foi possível preparar o upload." };
  }
}

/** Registra no banco um arquivo privado já enviado (confere que ele existe no storage). */
export async function registerProductFileAction(productId: string, path: string, fileName: string, format: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!uuidSchema.safeParse(productId).success) return { ok: false, error: "Produto inválido." };
  const fmt = String(format).toLowerCase();
  if (!(FILE_FORMATS as readonly string[]).includes(fmt)) return { ok: false, error: "Formato inválido." };
  const prefix = `products/${productId}/`;
  if (typeof path !== "string" || !path.startsWith(prefix) || path.includes("..") || !/^[a-z0-9/._-]+$/.test(path) || extOf(path) !== fmt) {
    return { ok: false, error: "Caminho de arquivo inválido." };
  }
  const product = await repo().getProductById(productId, { includeUnpublished: true });
  if (!product) return { ok: false, error: "Produto não encontrado." };
  const size = await storage().statObject("private", path);
  if (size === null) return { ok: false, error: "O arquivo não foi encontrado no storage. Envie novamente." };
  const name = String(fileName).trim().slice(0, 200) || path.split("/").pop()!;
  try {
    await repo().addProductFile({ product_id: productId, file_name: name, storage_path: path, format: fmt as FileFormat, size_bytes: size });
  } catch (e) {
    await storage().removePrivate(path).catch(() => {});
    return { ok: false, error: fail(e, "Não foi possível registrar o arquivo.")?.error };
  }
  revalidatePath(`/admin/produtos/${productId}`);
  return { ok: true };
}

export async function deleteProductFileAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Arquivo inválido." };
  try {
    const f = await repo().deleteProductFile(id);
    if (!f) return { error: "Arquivo não encontrado." };
    await storage().removePrivate(f.storage_path).catch((e) => console.error("[admin] removePrivate", e));
    revalidatePath(`/admin/produtos/${f.product_id}`);
  } catch (e) {
    return fail(e, "Não foi possível excluir o arquivo.");
  }
  return { ok: true, message: "Arquivo excluído." };
}

// ============================================================================
// Produtos
// ============================================================================

const productSchema = z
  .object({
    name: z.string().min(1, "Informe o nome.").max(120, "Máximo de 120 caracteres."),
    slug: slugField,
    short_description: z.string().max(200, "Máximo de 200 caracteres."),
    description: z.string().max(10000, "Descrição muito longa."),
    product_type: z.enum(["free", "premium"], { message: "Escolha o tipo." }),
    access_mode: z.enum(["free", "purchase_or_subscription", "purchase_only", "subscription_only"], { message: "Escolha o modo de acesso." }),
    price_cents: z.number({ message: "Preço inválido. Use o formato 29,90." }).int().min(0).max(10000000, "Preço máximo: R$ 100.000,00."),
    category_id: z.string().uuid().nullable(),
    tags: z.array(z.string().regex(SLUG_RE)).max(20),
    cover_image: imageUrl,
    before_image: imageUrl,
    after_image: imageUrl,
    gallery: z.array(z.string()).max(12, "Máximo de 12 imagens na galeria."),
    palette: z.array(z.string().regex(HEX_RE, "Cores no formato #RRGGBB.")).max(6, "Máximo de 6 cores."),
    formats: z.array(z.string().max(40)).max(20),
    compatibility: z.array(z.string().max(60)).max(20),
    install_instructions: z.string().max(5000, "Texto muito longo."),
    creator_name: z.string().max(80, "Máximo de 80 caracteres."),
    creator_handle: z.string().max(40, "Máximo de 40 caracteres."),
    creator_bio: z.string().max(500, "Máximo de 500 caracteres."),
    status: z.enum(["draft", "published", "archived"]),
    featured: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (d.product_type === "free" && (d.access_mode !== "free" || d.price_cents !== 0)) {
      ctx.addIssue({ code: "custom", path: ["access_mode"], message: "Produto grátis tem acesso livre e preço zero." });
    }
    if (d.product_type === "premium" && d.access_mode === "free") {
      ctx.addIssue({ code: "custom", path: ["access_mode"], message: "Escolha como o produto premium é liberado." });
    }
    if ((d.access_mode === "purchase_or_subscription" || d.access_mode === "purchase_only") && d.price_cents <= 0) {
      ctx.addIssue({ code: "custom", path: ["price"], message: "Produtos vendidos avulsos precisam de preço maior que zero." });
    }
  });

async function parseProductForm(form: FormData): Promise<{ data?: ProductInput; errors?: Record<string, string> }> {
  const name = str(form, "name");
  const product_type = str(form, "product_type") === "premium" ? "premium" : str(form, "product_type") === "free" ? "free" : "";
  const access_mode = (product_type === "free" ? "free" : str(form, "access_mode")) as AccessMode;
  const priceRaw = str(form, "price");
  const price = product_type === "free" ? 0 : parsePriceCents(priceRaw);
  if (price === null) return { errors: { price: "Preço inválido. Use o formato 29,90." } };

  const categories = await repo().listCategories();
  const catId = str(form, "category_id") || null;
  if (catId && !categories.some((c) => c.id === catId)) return { errors: { category_id: "Categoria inexistente." } };
  const slugs = new Set(categories.map((c) => c.slug));

  const gallery: string[] = [];
  for (const g of list(form, "gallery")) {
    const r = imageUrl.safeParse(g);
    if (!r.success) return { errors: { gallery: r.error.issues[0].message } };
    if (r.data) gallery.push(r.data);
  }

  const parsed = productSchema.safeParse({
    name,
    slug: str(form, "slug") || slugify(name),
    short_description: str(form, "short_description"),
    description: str(form, "description"),
    product_type,
    access_mode,
    price_cents: price,
    category_id: catId,
    tags: list(form, "tags").filter((t) => slugs.has(t)),
    cover_image: str(form, "cover_image"),
    before_image: str(form, "before_image"),
    after_image: str(form, "after_image"),
    gallery,
    palette: [...new Set(list(form, "palette").map((c) => c.toUpperCase()))],
    formats: csv(str(form, "formats")),
    compatibility: csv(str(form, "compatibility")),
    install_instructions: str(form, "install_instructions"),
    creator_name: str(form, "creator_name"),
    creator_handle: str(form, "creator_handle"),
    creator_bio: str(form, "creator_bio"),
    status: str(form, "status") || "draft",
    featured: bool(form, "featured"),
  });
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error);
    if (errs.price_cents) errs.price = errs.price_cents;
    return { errors: errs };
  }
  return { data: parsed.data as ProductInput };
}

export async function saveProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (id && !uuidSchema.safeParse(id).success) return { error: "Produto inválido." };
  const { data, errors } = await parseProductForm(form);
  if (!data) return { error: "Revise os campos destacados.", fieldErrors: errors };

  let savedId = id;
  try {
    if (id) await repo().updateProduct(id, data);
    else savedId = (await repo().createProduct(data)).id;
  } catch (e) {
    return fail(e, "Não foi possível salvar o produto.");
  }
  revalidateCatalog();
  if (!id) redirect(`/admin/produtos/${savedId}?criado=1`);
  return { ok: true, message: "Produto salvo." };
}

export async function setProductStatusAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  const status = z.enum(["draft", "published", "archived"]).safeParse(str(form, "status"));
  if (!uuidSchema.safeParse(id).success || !status.success) return { error: "Pedido inválido." };
  try {
    await repo().updateProduct(id, { status: status.data });
  } catch (e) {
    return fail(e, "Não foi possível alterar o status.");
  }
  revalidateCatalog();
  return { ok: true };
}

export async function setProductFeaturedAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Pedido inválido." };
  try {
    await repo().updateProduct(id, { featured: bool(form, "featured") });
  } catch (e) {
    return fail(e, "Não foi possível alterar o destaque.");
  }
  revalidateCatalog();
  return { ok: true };
}

export async function deleteProductAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Pedido inválido." };
  try {
    const files = await repo().listProductFiles(id);
    await repo().deleteProduct(id);
    await Promise.all(files.map((f) => storage().removePrivate(f.storage_path).catch((e) => console.error("[admin] removePrivate", e))));
  } catch (e) {
    return fail(e, "Não foi possível excluir o produto.");
  }
  revalidateCatalog();
  if (form.get("redirect") === "1") redirect("/admin/produtos?excluido=1");
  return { ok: true, message: "Produto excluído." };
}

// ============================================================================
// Categorias
// ============================================================================

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Informe o nome.").max(60, "Máximo de 60 caracteres."),
  slug: slugField,
  description: z.string().max(500, "Máximo de 500 caracteres."),
  kind: z.enum(["style", "subject"], { message: "Escolha o tipo." }),
  cover_image: imageUrl,
  sort_order: z.number({ message: "Use um número inteiro." }).int("Use um número inteiro.").min(-9999).max(9999),
});

export async function saveCategoryAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = str(form, "name");
  const parsed = categorySchema.safeParse({
    id: str(form, "id") || undefined,
    name,
    slug: str(form, "slug") || slugify(name),
    description: str(form, "description"),
    kind: str(form, "kind"),
    cover_image: str(form, "cover_image"),
    sort_order: Number(str(form, "sort_order") || "0"),
  });
  if (!parsed.success) return { error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  try {
    await repo().upsertCategory(parsed.data);
  } catch (e) {
    return fail(e, "Não foi possível salvar a categoria.");
  }
  revalidateCatalog();
  return { ok: true, message: parsed.data.id ? "Categoria atualizada." : "Categoria criada." };
}

export async function deleteCategoryAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Pedido inválido." };
  try {
    await repo().deleteCategory(id);
  } catch (e) {
    return fail(e, "Não foi possível excluir a categoria.");
  }
  revalidateCatalog();
  return { ok: true, message: "Categoria excluída." };
}

// ============================================================================
// Usuários
// ============================================================================

export async function setUserRoleAction(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireAdmin();
  const id = str(form, "id");
  const role = z.enum(["user", "admin"]).safeParse(str(form, "role"));
  if (!uuidSchema.safeParse(id).success || !role.success) return { error: "Pedido inválido." };
  if (id === me.id && role.data !== "admin") return { error: "Você não pode remover o seu próprio acesso de administrador." };
  try {
    await repo().adminSetRole(id, role.data);
  } catch (e) {
    return fail(e, "Não foi possível alterar o papel.");
  }
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: true, message: role.data === "admin" ? "Usuário promovido a administrador." : "Acesso de administrador removido." };
}

// ============================================================================
// Coleções
// ============================================================================

async function validProductIds(ids: string[]) {
  if (!ids.length) return [];
  const all = await repo().listProducts({ includeUnpublished: true });
  const known = new Set(all.map((p) => p.id));
  return [...new Set(ids)].filter((id) => known.has(id));
}

const collectionSchema = z.object({
  title: z.string().min(1, "Informe o título.").max(120, "Máximo de 120 caracteres."),
  slug: slugField,
  description: z.string().max(5000, "Texto muito longo."),
  cover_image: imageUrl,
  is_premium: z.boolean(),
  price_cents: z.number().int().positive("O preço do pacote precisa ser maior que zero.").max(10000000).nullable(),
  featured: z.boolean(),
  status: z.enum(["draft", "published"]),
  sort_order: z.number({ message: "Use um número inteiro." }).int("Use um número inteiro.").min(-9999).max(9999),
  product_ids: z.array(z.string().uuid()).max(200),
});

export async function saveCollectionAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (id && !uuidSchema.safeParse(id).success) return { error: "Coleção inválida." };
  const title = str(form, "title");
  const priceRaw = str(form, "price");
  const price = priceRaw ? parsePriceCents(priceRaw) : null;
  if (priceRaw && (price === null || price <= 0)) return { error: "Revise os campos destacados.", fieldErrors: { price: "Preço inválido. Use o formato 49,90 ou deixe vazio." } };
  const parsed = collectionSchema.safeParse({
    title,
    slug: str(form, "slug") || slugify(title),
    description: str(form, "description"),
    cover_image: str(form, "cover_image"),
    is_premium: bool(form, "is_premium"),
    price_cents: price,
    featured: bool(form, "featured"),
    status: str(form, "status") || "draft",
    sort_order: Number(str(form, "sort_order") || "0"),
    product_ids: await validProductIds(list(form, "product_ids")),
  });
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error);
    if (errs.price_cents) errs.price = errs.price_cents;
    return { error: "Revise os campos destacados.", fieldErrors: errs };
  }
  let savedId = id;
  try {
    if (id) await repo().updateCollection(id, parsed.data);
    else savedId = (await repo().createCollection(parsed.data)).id;
  } catch (e) {
    return fail(e, "Não foi possível salvar a coleção.");
  }
  revalidateCatalog();
  if (!id) redirect(`/admin/conteudo/colecoes/${savedId}?criado=1`);
  return { ok: true, message: "Coleção salva." };
}

export async function deleteCollectionAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Pedido inválido." };
  try {
    await repo().deleteCollection(id);
  } catch (e) {
    return fail(e, "Não foi possível excluir a coleção.");
  }
  revalidateCatalog();
  if (form.get("redirect") === "1") redirect("/admin/conteudo/colecoes?excluido=1");
  return { ok: true, message: "Coleção excluída." };
}

// ============================================================================
// Inspirações
// ============================================================================

const inspirationSchema = z.object({
  title: z.string().min(1, "Informe o título.").max(120, "Máximo de 120 caracteres."),
  slug: slugField,
  style_name: z.string().max(80, "Máximo de 80 caracteres."),
  image_url: imageUrl.refine((v) => v !== null, "Informe a imagem.").transform((v) => v as string),
  palette: z.array(z.string().regex(HEX_RE, "Cores no formato #RRGGBB.")).max(6, "Máximo de 6 cores."),
  description: z.string().max(5000, "Texto muito longo."),
  product_ids: z.array(z.string().uuid()).max(50),
  status: z.enum(["draft", "published"]),
  sort_order: z.number({ message: "Use um número inteiro." }).int("Use um número inteiro.").min(-9999).max(9999),
});

export async function saveInspirationAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (id && !uuidSchema.safeParse(id).success) return { error: "Inspiração inválida." };
  const title = str(form, "title");
  const parsed = inspirationSchema.safeParse({
    title,
    slug: str(form, "slug") || slugify(title),
    style_name: str(form, "style_name"),
    image_url: str(form, "image_url"),
    palette: [...new Set(list(form, "palette").map((c) => c.toUpperCase()))],
    description: str(form, "description"),
    product_ids: await validProductIds(list(form, "product_ids")),
    status: str(form, "status") || "draft",
    sort_order: Number(str(form, "sort_order") || "0"),
  });
  if (!parsed.success) return { error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  let savedId = id;
  try {
    if (id) await repo().updateInspiration(id, parsed.data);
    else savedId = (await repo().createInspiration(parsed.data)).id;
  } catch (e) {
    return fail(e, "Não foi possível salvar a inspiração.");
  }
  revalidateCatalog();
  if (!id) redirect(`/admin/conteudo/inspiracoes/${savedId}?criado=1`);
  return { ok: true, message: "Inspiração salva." };
}

export async function deleteInspirationAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Pedido inválido." };
  try {
    await repo().deleteInspiration(id);
  } catch (e) {
    return fail(e, "Não foi possível excluir a inspiração.");
  }
  revalidateCatalog();
  if (form.get("redirect") === "1") redirect("/admin/conteudo/inspiracoes?excluido=1");
  return { ok: true, message: "Inspiração excluída." };
}

// ============================================================================
// Banners
// ============================================================================

const bannerSchema = z.object({
  title: z.string().min(1, "Informe o título.").max(120, "Máximo de 120 caracteres."),
  subtitle: z.string().max(300, "Máximo de 300 caracteres."),
  image_url: imageUrl,
  link_url: z
    .string()
    .max(300)
    .regex(/^\/(?!\/)[^\s]*$/, "Use um link interno começando com / (ex.: /presets)."),
  link_label: z.string().min(1, "Informe o rótulo do botão.").max(40, "Máximo de 40 caracteres."),
  active: z.boolean(),
  position: z.number({ message: "Use um número inteiro." }).int("Use um número inteiro.").min(-9999).max(9999),
});

export async function saveBannerAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (id && !uuidSchema.safeParse(id).success) return { error: "Banner inválido." };
  const parsed = bannerSchema.safeParse({
    title: str(form, "title"),
    subtitle: str(form, "subtitle"),
    image_url: str(form, "image_url"),
    link_url: str(form, "link_url") || "/presets",
    link_label: str(form, "link_label") || "Explorar",
    active: bool(form, "active"),
    position: Number(str(form, "position") || "0"),
  });
  if (!parsed.success) return { error: "Revise os campos destacados.", fieldErrors: fieldErrors(parsed.error) };
  try {
    if (id) await repo().updateBanner(id, parsed.data);
    else await repo().createBanner(parsed.data);
  } catch (e) {
    return fail(e, "Não foi possível salvar o banner.");
  }
  revalidateCatalog();
  return { ok: true, message: id ? "Banner atualizado." : "Banner criado." };
}

export async function deleteBannerAction(_: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = str(form, "id");
  if (!uuidSchema.safeParse(id).success) return { error: "Pedido inválido." };
  try {
    await repo().deleteBanner(id);
  } catch (e) {
    return fail(e, "Não foi possível excluir o banner.");
  }
  revalidateCatalog();
  return { ok: true, message: "Banner excluído." };
}
