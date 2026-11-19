import { db } from "./db";

// Preferências do usuário (cria a linha com valores padrão na primeira leitura).
async function get(userId: number) {
  const row = await db.selectFrom("userPreferences").selectAll().where("userId", "=", userId).executeTakeFirst();
  if (row) return row;
  await db.insertInto("userPreferences").values({ userId }).onConflict((oc) => oc.column("userId").doNothing()).execute();
  return db.selectFrom("userPreferences").selectAll().where("userId", "=", userId).executeTakeFirstOrThrow();
}

export const userPrefs = { get };
