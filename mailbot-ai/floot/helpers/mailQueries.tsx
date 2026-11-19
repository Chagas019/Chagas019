// Espelho: a implementação completa (Kysely) vive no Floot em helpers/mailQueries.tsx.
// Aqui só o tipo usado pela lógica testada; nos testes o módulo é simulado.
import type { MbCategory, MbPriority } from "./schema";

export type TriagedRow = {
  id: string; gmailId: string; threadId: string; receivedAt: Date; isUnread: boolean;
  category: MbCategory; priority: MbPriority; relevanceScore: number; needsReply: boolean; deadline: Date | null;
  isBill: boolean; isAppointment: boolean; appointmentAt: Date | null; action: string; reason: string;
};

export const mailQueries = {
  triaged: async (_userId: number, _f: Record<string, unknown>): Promise<TriagedRow[]> => { throw new Error("somente no Floot"); },
  awaitingReply: async (_userId: number, _limit: number): Promise<TriagedRow[]> => { throw new Error("somente no Floot"); },
};
