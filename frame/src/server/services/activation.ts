import "server-only";
import { db } from "../db";
import { activationEvent } from "../db/schema";

export type ActivationEventName = (typeof activationEvent.$inferInsert)["event"];

/** Registra marcos de ativação uma única vez por usuário (métricas de produto, sem conteúdo). */
export async function recordActivation(userId: string, event: ActivationEventName): Promise<void> {
  await db.insert(activationEvent).values({ userId, event }).onConflictDoNothing();
}
