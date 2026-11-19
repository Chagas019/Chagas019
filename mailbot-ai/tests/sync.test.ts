import { beforeEach, describe, expect, it } from 'vitest';
import { GmailClient } from '../src/lib/gmail/client';
import { syncAccount } from '../src/lib/gmail/sync';
import { FakeGmail, makeMessage } from './helpers/fake-gmail';
import { MemoryRepo } from './helpers/memory-repo';

const U = 'user-1';
let repo: MemoryRepo; let g: FakeGmail; let client: GmailClient;

beforeEach(() => {
  repo = new MemoryRepo();
  g = new FakeGmail();
  client = new GmailClient({ getAccessToken: async () => g.validToken }, { fetchImpl: g.fetch, sleep: async () => {} });
});

describe('sincronização', () => {
  it('inicial: pagina todas as mensagens, retomando entre execuções', async () => {
    for (let i = 0; i < 230; i++) g.add(makeMessage(`m${i}`, { date: 1_700_000_000_000 + i * 1000 }));
    let acc = repo.addAccount({ user_id: U });
    const r1 = await syncAccount(repo, client, acc, { maxMessagesPerRun: 100 });
    expect(r1).toMatchObject({ kind: 'initial', hasMore: true, added: 100, status: 'partial' });
    acc = (await repo.getAccountByUser(U))!;
    expect(acc.initial_sync_page_token).toBe('100');
    expect(acc.history_id).toBe(String(g.historyId));
    await syncAccount(repo, client, acc, { maxMessagesPerRun: 100 });
    acc = (await repo.getAccountByUser(U))!;
    const r3 = await syncAccount(repo, client, acc, { maxMessagesPerRun: 100 });
    expect(r3).toMatchObject({ hasMore: false, status: 'success' });
    expect(repo.emails.size).toBe(230);
    expect((await repo.getAccountByUser(U))!.initial_sync_done).toBe(true);
    expect(repo.syncs.map((s) => s.status)).toEqual(['partial', 'partial', 'success']);
  });

  it('incremental: novas, apagadas e rótulos alterados — sem duplicar', async () => {
    g.add(makeMessage('a')); g.add(makeMessage('b')); g.add(makeMessage('c'));
    await syncAccount(repo, client, repo.addAccount({ user_id: U }));
    expect(repo.emails.size).toBe(3);

    g.add(makeMessage('d', { subject: 'Nova' }));
    g.remove('a');
    g.relabel('b', ['INBOX']); // lida
    g.relabel('c', ['TRASH']); // movida para lixeira
    const acc = (await repo.getAccountByUser(U))!;
    const r = await syncAccount(repo, client, acc);
    expect(r).toMatchObject({ kind: 'incremental', added: 1, deleted: 2, updated: 1, status: 'success' });
    const byGmail = new Map([...repo.emails.values()].map((e) => [e.gmail_id, e]));
    expect([...byGmail.keys()].sort()).toEqual(['b', 'd']);
    expect(byGmail.get('b')!.is_unread).toBe(false);
    expect((await repo.getAccountByUser(U))!.history_id).toBe(String(g.historyId));

    // rodar de novo não traz nada novo
    const again = await syncAccount(repo, client, (await repo.getAccountByUser(U))!);
    expect(again).toMatchObject({ added: 0, deleted: 0, fetched: 0 });
  });

  it('historyId expirado (404): refaz a sincronização completa', async () => {
    g.add(makeMessage('a'));
    await syncAccount(repo, client, repo.addAccount({ user_id: U }));
    g.add(makeMessage('b'));
    g.expiredHistoryBefore = 999_999;
    const r = await syncAccount(repo, client, (await repo.getAccountByUser(U))!);
    expect(r.kind).toBe('full_resync');
    expect(repo.emails.size).toBe(2);
    expect(repo.syncs.at(-2)!.error).toBe('history_expired');
  });

  it('autorização revogada: marca a conta para reconexão', async () => {
    const bad = new GmailClient({ getAccessToken: async () => 'revogado' }, { fetchImpl: g.fetch, sleep: async () => {} });
    const r = await syncAccount(repo, bad, repo.addAccount({ user_id: U }));
    expect(r.status).toBe('reauth_required');
    expect((await repo.getAccountByUser(U))!.status).toBe('reauth_required');
  });

  it('conteúdo alterado volta para a fila de triagem; igual mantém', async () => {
    g.add(makeMessage('a', { body: 'v1' }));
    await syncAccount(repo, client, repo.addAccount({ user_id: U }));
    const e = [...repo.emails.values()][0];
    await repo.setTriageStatus(U, [e.id], 'done');
    await repo.upsertEmails(U, e.account_id, [{ ...(await import('../src/lib/gmail/parse')).parseMessage(makeMessage('a', { body: 'v1' })) }]);
    expect(repo.emails.get(e.id)!.triage_status).toBe('done');
    await repo.upsertEmails(U, e.account_id, [(await import('../src/lib/gmail/parse')).parseMessage(makeMessage('a', { body: 'v2' }))]);
    expect(repo.emails.get(e.id)!.triage_status).toBe('pending');
  });
});
