import { db } from "./db";
import { gmailApi } from "./gmailApi";
import { emailParse } from "./emailParse";

// Remetente, assunto e trecho para exibição: lidos do Gmail na hora (format=metadata),
// nunca gravados no banco.
export type MessageMeta = { gmailId: string; fromName: string | null; fromEmail: string; to: string; subject: string; snippet: string };

export async function messageMeta(userId: number, gmailIds: string[]): Promise<Map<string, MessageMeta>> {
  const out = new Map<string, MessageMeta>();
  if (!gmailIds.length) return out;
  const acc = await db.selectFrom("gmailAccounts").select("googleEmail").where("userId", "=", userId).where("status", "=", "connected").executeTakeFirst();
  if (!acc) return out;
  const { found } = await gmailApi.getMessages(acc.googleEmail, [...new Set(gmailIds)].slice(0, 60), "metadata", 10);
  for (const m of found) out.set(m.id, emailParse.displayMeta(m));
  return out;
}
