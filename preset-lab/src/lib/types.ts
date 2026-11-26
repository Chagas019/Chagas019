// Tipos de domínio do PRESET LAB (espelham as tabelas em supabase/migrations)

export type Role = "user" | "admin";
export type ProductType = "free" | "premium";
export type AccessMode = "free" | "purchase_or_subscription" | "purchase_only" | "subscription_only";
export type ProductStatus = "draft" | "published" | "archived";
export type FileFormat = "dng" | "xmp" | "zip" | "cube" | "3dl";
export type PurchaseStatus = "pending" | "paid" | "failed" | "refunded" | "cancelled";
export type PurchaseKind = "product" | "collection" | "subscription";
export type PaymentProviderName = "mercadopago" | "dev";
export type PlanId = "premium_monthly" | "premium_yearly";
export type SubscriptionStatus = "pending" | "active" | "past_due" | "cancelled" | "expired";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  role: Role;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  emailConfirmed: boolean;
  profile: Profile;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  kind: "style" | "subject";
  cover_image: string | null;
  sort_order: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  short_description: string;
  description: string;
  price_cents: number;
  currency: "BRL";
  product_type: ProductType;
  access_mode: AccessMode;
  category_id: string | null;
  tags: string[];
  cover_image: string | null;
  before_image: string | null;
  after_image: string | null;
  gallery: string[];
  palette: string[];
  formats: string[];
  compatibility: string[];
  install_instructions: string;
  creator_name: string;
  creator_handle: string;
  creator_bio: string;
  status: ProductStatus;
  published_at: string | null;
  featured: boolean;
  downloads_count: number;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductFile {
  id: string;
  product_id: string;
  file_name: string;
  storage_path: string;
  format: FileFormat;
  size_bytes: number;
  created_at: string;
}

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description: string;
  cover_image: string | null;
  is_premium: boolean;
  price_cents: number | null;
  featured: boolean;
  status: "draft" | "published";
  sort_order: number;
  is_demo: boolean;
  product_ids: string[];
}

export interface Purchase {
  id: string;
  user_id: string;
  status: PurchaseStatus;
  kind: PurchaseKind;
  total_cents: number;
  currency: "BRL";
  provider: PaymentProviderName;
  provider_reference: string | null;
  provider_payment_id: string | null;
  is_simulated: boolean;
  created_at: string;
  paid_at: string | null;
  items: PurchaseItem[];
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string | null;
  collection_id: string | null;
  plan: PlanId | null;
  title: string;
  unit_price_cents: number;
}

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanId;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  provider: PaymentProviderName;
  provider_subscription_id: string | null;
  is_simulated: boolean;
  created_at: string;
}

export interface DownloadRecord {
  id: string;
  user_id: string;
  product_id: string;
  file_id: string | null;
  created_at: string;
}

export interface InspirationPost {
  id: string;
  slug: string;
  title: string;
  style_name: string;
  image_url: string;
  palette: string[];
  description: string;
  product_ids: string[];
  status: "draft" | "published";
  sort_order: number;
  is_demo: boolean;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string | null;
  link_url: string;
  link_label: string;
  active: boolean;
  position: number;
}

export interface DashboardStats {
  users: number;
  products: number;
  published_products: number;
  downloads: number;
  paid_orders: number;
  revenue_cents: number;
  simulated_orders: number;
  active_subscriptions: number;
}

export type SortOption = "recent" | "popular" | "price_asc" | "price_desc" | "name";

export interface ProductQuery {
  q?: string;
  category?: string; // slug (categoria principal ou tag)
  access?: "free" | "premium";
  sort?: SortOption;
  featured?: boolean;
  includeUnpublished?: boolean;
  ids?: string[];
  limit?: number;
}

/** Dados editáveis de um produto (Admin Studio). */
export type ProductInput = Pick<
  Product,
  | "slug"
  | "name"
  | "short_description"
  | "description"
  | "price_cents"
  | "product_type"
  | "access_mode"
  | "category_id"
  | "tags"
  | "cover_image"
  | "before_image"
  | "after_image"
  | "gallery"
  | "palette"
  | "formats"
  | "compatibility"
  | "install_instructions"
  | "creator_name"
  | "creator_handle"
  | "creator_bio"
  | "status"
  | "featured"
>;

export type CollectionInput = Pick<Collection, "slug" | "title" | "description" | "cover_image" | "is_premium" | "price_cents" | "featured" | "status" | "sort_order" | "product_ids">;
export type InspirationInput = Pick<InspirationPost, "slug" | "title" | "style_name" | "image_url" | "palette" | "description" | "product_ids" | "status" | "sort_order">;
export type BannerInput = Pick<Banner, "title" | "subtitle" | "image_url" | "link_url" | "link_label" | "active" | "position">;
