import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { AppError } from "./errors";

/**
 * Rate limit de janela fixa persistido no Postgres (funciona com várias instâncias).
 * Lança RATE_LIMITED quando o limite é excedido.
 */
export async function enforceRateLimit(key: string, max: number, windowSeconds: number): Promise<void> {
  if (process.env.FRAME_DISABLE_APP_RATE_LIMIT === "1") return;
  const rows = await db.execute<{ count: number }>(sql`
    insert into app_rate_limit (key, count, window_start) values (${key}, 1, now())
    on conflict (key) do update set
      count = case when app_rate_limit.window_start < now() - make_interval(secs => ${windowSeconds})
                   then 1 else app_rate_limit.count + 1 end,
      window_start = case when app_rate_limit.window_start < now() - make_interval(secs => ${windowSeconds})
                   then now() else app_rate_limit.window_start end
    returning count
  `);
  const count = Number(rows[0]?.count ?? 0);
  if (count > max) throw new AppError("RATE_LIMITED");
}
