import "server-only";
import { cache } from "react";
import { repo } from "@/lib/repo";
import type { Product, SessionUser, Subscription } from "@/lib/types";
import { decideAccess } from "./access";

export interface Entitlements {
  ownedIds: Set<string>;
  favoriteIds: Set<string>;
  subscription: Subscription | null;
  isAdmin: boolean;
}

/** Direitos do usuário na requisição atual (memoizado). Sempre calculado no servidor. */
export const getEntitlements = cache(async (user: SessionUser | null): Promise<Entitlements> => {
  if (!user) return { ownedIds: new Set(), favoriteIds: new Set(), subscription: null, isAdmin: false };
  const r = repo();
  const [owned, favs, sub] = await Promise.all([r.listOwnedProductIds(user.id), r.listFavoriteIds(user.id), r.getActiveSubscription(user.id)]);
  return { ownedIds: new Set(owned), favoriteIds: new Set(favs), subscription: sub, isAdmin: user.profile.role === "admin" };
});

export function accessFor(product: Pick<Product, "id" | "access_mode" | "status">, user: SessionUser | null, ent: Entitlements) {
  return decideAccess(product, { loggedIn: !!user, isAdmin: ent.isAdmin, owns: ent.ownedIds.has(product.id), hasActiveSubscription: !!ent.subscription });
}
