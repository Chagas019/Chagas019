import { NextResponse } from 'next/server';
import { gmailFor, handle, HttpError, llmFor, rateLimit, repo, requireUser } from '@/lib/server/context';
import { syncAndTriage } from '@/lib/server/pipeline';

export const maxDuration = 60;

// Sincronização manual: uma rodada (retomável). O app chama de novo enquanto hasMore = true.
export function POST() {
  return handle('sync', async () => {
    const user = await requireUser();
    await rateLimit(`sync:${user.id}`, 30, 300);
    const r = repo();
    const account = await r.getAccountByUser(user.id);
    if (!account || account.status === 'disconnected') throw new HttpError(409, 'Conecte o Gmail primeiro.');
    if (account.status === 'reauth_required') throw new HttpError(409, 'A autorização do Gmail expirou. Reconecte a conta.');
    const out = await syncAndTriage(r, llmFor(r), gmailFor(r, account.id), account);
    if (out.sync.status === 'reauth_required') throw new HttpError(409, 'A autorização do Gmail expirou. Reconecte a conta.');
    const pending = (await r.pendingTriage(user.id, 1)).length > 0;
    return NextResponse.json({ sync: out.sync, triage: out.triage, hasMore: out.sync.hasMore || (pending && !out.triage?.budgetExceeded && (out.triage?.classified ?? 0) > 0) });
  });
}
