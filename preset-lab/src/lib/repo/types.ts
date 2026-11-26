import type {
  Banner,
  BannerInput,
  Category,
  Collection,
  CollectionInput,
  DashboardStats,
  DownloadRecord,
  InspirationInput,
  InspirationPost,
  PaymentProviderName,
  Product,
  ProductFile,
  ProductInput,
  ProductQuery,
  Profile,
  Purchase,
  PurchaseItem,
  PurchaseKind,
  PurchaseStatus,
  Role,
  Subscription,
} from "@/lib/types";

export type FulfillResult = "fulfilled" | "duplicate_event" | "already_paid" | "purchase_not_found";

export interface NewPurchase {
  userId: string;
  kind: PurchaseKind;
  provider: PaymentProviderName;
  isSimulated: boolean;
  items: Omit<PurchaseItem, "id" | "purchase_id">[];
}

export interface AdminPurchaseRow extends Purchase {
  user_email: string;
}

/**
 * Camada de dados. Duas implementações:
 *  - SupabaseRepository (produção, RLS + service role só no servidor)
 *  - LocalRepository (modo demonstração local, arquivo JSON)
 * As regras de negócio ficam em src/lib/services e usam só esta interface.
 */
export interface Repository {
  // catálogo público
  listCategories(): Promise<Category[]>;
  listProducts(query?: ProductQuery): Promise<Product[]>;
  getProductBySlug(slug: string, opts?: { includeUnpublished?: boolean }): Promise<Product | null>;
  getProductById(id: string, opts?: { includeUnpublished?: boolean }): Promise<Product | null>;
  listCollections(opts?: { includeUnpublished?: boolean }): Promise<Collection[]>;
  getCollectionBySlug(slug: string): Promise<Collection | null>;
  getCollectionById(id: string): Promise<Collection | null>;
  listInspiration(opts?: { includeUnpublished?: boolean }): Promise<InspirationPost[]>;
  listBanners(opts?: { includeInactive?: boolean }): Promise<Banner[]>;

  // arquivos (privilegiado — só o servidor)
  listProductFiles(productId: string): Promise<ProductFile[]>;
  getProductFile(fileId: string): Promise<ProductFile | null>;

  // favoritos
  listFavoriteIds(userId: string): Promise<string[]>;
  setFavorite(userId: string, productId: string, on: boolean): Promise<void>;

  // comércio (privilegiado)
  createPurchase(input: NewPurchase): Promise<Purchase>;
  setPurchaseProviderReference(purchaseId: string, reference: string): Promise<void>;
  setPurchaseStatus(purchaseId: string, status: Exclude<PurchaseStatus, "paid">): Promise<void>;
  getPurchase(purchaseId: string): Promise<Purchase | null>;
  listPurchases(userId: string): Promise<Purchase[]>;
  fulfillPurchase(args: { purchaseId: string; providerPaymentId: string; eventId: string; provider: PaymentProviderName; payload: unknown }): Promise<FulfillResult>;
  listOwnedProductIds(userId: string): Promise<string[]>;
  getActiveSubscription(userId: string): Promise<Subscription | null>;
  listSubscriptions(userId: string): Promise<Subscription[]>;
  setSubscriptionCancelAtPeriodEnd(userId: string, subscriptionId: string, cancel: boolean): Promise<void>;
  recordDownload(userId: string, productId: string, fileId: string | null): Promise<void>;
  listDownloads(userId: string): Promise<DownloadRecord[]>;
  rateLimit(key: string, windowSeconds: number, max: number): Promise<boolean>;

  // perfis
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, data: { display_name: string; bio: string }): Promise<void>;

  // Admin Studio
  adminStats(): Promise<DashboardStats>;
  adminListUsers(): Promise<Profile[]>;
  adminSetRole(userId: string, role: Role): Promise<void>;
  adminListPurchases(opts?: { userId?: string }): Promise<AdminPurchaseRow[]>;
  adminListSubscriptions(opts?: { userId?: string }): Promise<(Subscription & { user_email: string })[]>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: string, input: Partial<ProductInput>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  addProductFile(file: Omit<ProductFile, "id" | "created_at">): Promise<ProductFile>;
  deleteProductFile(id: string): Promise<ProductFile | null>;
  upsertCategory(input: Omit<Category, "id"> & { id?: string }): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  createCollection(input: CollectionInput): Promise<Collection>;
  updateCollection(id: string, input: CollectionInput): Promise<Collection>;
  deleteCollection(id: string): Promise<void>;
  createInspiration(input: InspirationInput): Promise<InspirationPost>;
  updateInspiration(id: string, input: InspirationInput): Promise<InspirationPost>;
  deleteInspiration(id: string): Promise<void>;
  createBanner(input: BannerInput): Promise<Banner>;
  updateBanner(id: string, input: BannerInput): Promise<Banner>;
  deleteBanner(id: string): Promise<void>;
}
