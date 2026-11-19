import { NextResponse } from 'next/server';
import { z } from 'zod';
import { buildReport } from '@/lib/agents/summary';
import { handle, HttpError, llmFor, rateLimit, repo, requireUser } from '@/lib/server/context';

export const maxDuration = 60;

const Body = z.object({
  kind: z.enum(['daily', 'weekly']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  force: z.boolean().optional(),
});

export function POST(req: Request) {
  return handle('reports', async () => {
    const user = await requireUser();
    await rateLimit(`report:${user.id}`, 10, 300);
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) throw new HttpError(400, 'Parâmetros inválidos.');
    const r = repo();
    const { report, reused } = await buildReport(r, llmFor(r), user.id, parsed.data);
    return NextResponse.json({ report, reused });
  });
}
