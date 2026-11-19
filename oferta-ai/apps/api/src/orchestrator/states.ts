import { ProductState } from "@prisma/client";
import { prisma } from "../lib/core";

/**
 * Máquina de estados dos produtos.
 * PENDING → RESEARCHING → APPROVED → COPY_GENERATED → READY_TO_PUBLISH → PUBLISHING → PUBLISHED
 * Qualquer etapa pode ir para FAILED (erro técnico, com retentativa) ou REJECTED (critério de qualidade).
 */
export const TRANSITIONS: Record<ProductState, ProductState[]> = {
  PENDING: ["RESEARCHING", "REJECTED", "FAILED"],
  RESEARCHING: ["APPROVED", "REJECTED", "FAILED"],
  APPROVED: ["COPY_GENERATED", "REJECTED", "FAILED"],
  COPY_GENERATED: ["READY_TO_PUBLISH", "APPROVED", "REJECTED", "FAILED"],
  READY_TO_PUBLISH: ["PUBLISHING", "APPROVED", "REJECTED", "FAILED"],
  PUBLISHING: ["PUBLISHED", "READY_TO_PUBLISH", "FAILED"],
  PUBLISHED: ["RESEARCHING"],
  FAILED: ["PENDING", "APPROVED", "READY_TO_PUBLISH", "REJECTED"],
  REJECTED: ["RESEARCHING"],
};

export class InvalidTransitionError extends Error {}

export function canTransition(from: ProductState, to: ProductState): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Transição atômica com verificação otimista (updateMany com where state=from),
 * o que evita que dois workers processem o mesmo produto em paralelo.
 */
export async function transition(
  productId: string,
  from: ProductState,
  to: ProductState,
  actor: string,
  reason?: string,
  extra: Record<string, unknown> = {},
): Promise<boolean> {
  if (!canTransition(from, to)) throw new InvalidTransitionError(`${from} → ${to} não permitido`);
  const res = await prisma.product.updateMany({ where: { id: productId, state: from }, data: { state: to, ...extra } });
  if (res.count === 0) return false;
  await prisma.productStateHistory.create({ data: { productId, fromState: from, toState: to, actor, reason } });
  return true;
}
