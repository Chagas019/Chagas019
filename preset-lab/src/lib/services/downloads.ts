import "server-only";
import { config } from "@/lib/config";
import { repo } from "@/lib/repo";
import { storage } from "@/lib/storage";
import type { SessionUser } from "@/lib/types";
import { decideAccess, type AccessReason } from "./access";

export class DownloadError extends Error {
  constructor(
    public code: "not_found" | "forbidden" | "rate_limited" | "storage",
    public reason: AccessReason | null,
    message: string
  ) {
    super(message);
  }
}

/**
 * Autoriza um download e devolve uma URL assinada e temporária.
 * Ordem: arquivo existe → produto existe → decisão de acesso → limite de taxa → registro → URL assinada.
 * Nunca existe link público permanente para arquivos de presets.
 */
export async function authorizeDownload(user: SessionUser | null, fileId: string): Promise<{ url: string; fileName: string }> {
  const r = repo();
  if (!/^[0-9a-f-]{36}$/i.test(fileId)) throw new DownloadError("not_found", null, "Arquivo não encontrado.");
  const file = await r.getProductFile(fileId);
  if (!file) throw new DownloadError("not_found", null, "Arquivo não encontrado.");
  const isAdmin = user?.profile.role === "admin";
  const product = await r.getProductById(file.product_id, { includeUnpublished: isAdmin });
  if (!product) throw new DownloadError("not_found", "unavailable", "Este produto não está disponível.");

  const [owned, sub] = user ? await Promise.all([r.listOwnedProductIds(user.id), r.getActiveSubscription(user.id)]) : [[], null];
  const decision = decideAccess(product, { loggedIn: !!user, isAdmin, owns: owned.includes(product.id), hasActiveSubscription: !!sub });
  if (!decision.allowed) throw new DownloadError("forbidden", decision.reason, "Você não tem acesso a este arquivo.");

  if (!(await r.rateLimit(`download:${user!.id}`, 600, 60))) throw new DownloadError("rate_limited", null, "Muitos downloads em pouco tempo. Aguarde alguns minutos.");

  await r.recordDownload(user!.id, product.id, file.id);
  try {
    const url = await storage().signedDownloadUrl(file.storage_path, file.file_name, config.downloadUrlTtl);
    return { url, fileName: file.file_name };
  } catch {
    throw new DownloadError("storage", null, "Não foi possível gerar o link agora. Tente novamente.");
  }
}
