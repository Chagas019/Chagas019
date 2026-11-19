import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handle, HttpError, rateLimit, repo, requireUser } from '@/lib/server/context';

const addr = z.string().trim().toLowerCase().max(254).regex(/^@?[a-z0-9._%+-]*@?[a-z0-9.-]+\.[a-z]{2,}$/, 'Endereço ou domínio inválido');

const Body = z.object({
  timezone: z.string().refine((tz) => { try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; } }, 'Fuso inválido'),
  sync_frequency_minutes: z.union([z.literal(0), z.literal(15), z.literal(30), z.literal(60), z.literal(180), z.literal(360), z.literal(720), z.literal(1440)]),
  daily_report_hour: z.number().int().min(0).max(23),
  initial_sync_days: z.number().int().min(0).max(3650),
  vip_senders: z.array(addr).max(100),
  work_domains: z.array(addr).max(50),
  ignored_senders: z.array(addr).max(200),
  ai_daily_budget_usd: z.number().min(0).max(50),
}).partial();

export function PATCH(req: Request) {
  return handle('preferences', async () => {
    const user = await requireUser();
    await rateLimit(`prefs:${user.id}`, 30, 300);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Dados inválidos.');
    await repo().updatePrefs(user.id, parsed.data);
    return NextResponse.json({ ok: true });
  });
}
