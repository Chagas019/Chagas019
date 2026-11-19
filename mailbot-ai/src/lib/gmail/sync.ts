import { errorCode, log } from '../log';
import type { Repo, SyncCounters } from '../data/repo';
import type { AccountRow } from '../data/types';
import { GmailApiError, GmailClient, ReauthRequiredError } from './client';
import { parseMessage } from './parse';

export interface SyncResult extends SyncCounters {
  kind: 'initial' | 'incremental' | 'full_resync';
  hasMore: boolean;
  status: 'success' | 'partial' | 'error' | 'reauth_required';
}

export interface SyncOptions {
  /** Máximo de mensagens baixadas por execução (cabe no tempo de uma função serverless). */
  maxMessagesPerRun?: number;
}

/**
 * Sincronização Gmail -> banco.
 * - Inicial: percorre messages.list com paginação (cursor salvo na conta, retomável).
 * - Incremental: history.list a partir do último historyId (novas, apagadas, rótulos alterados).
 * - Se o historyId expirou (404), refaz a sincronização completa.
 */
export async function syncAccount(repo: Repo, gmail: GmailClient, account: AccountRow, opts: SyncOptions = {}): Promise<SyncResult> {
  const max = opts.maxMessagesPerRun ?? 300;
  const prefs = await repo.getPrefs(account.user_id);
  const kind: SyncResult['kind'] = account.initial_sync_done ? 'incremental' : 'initial';
  const syncId = await repo.startSync(account.user_id, account.id, kind);
  const c: SyncCounters = { fetched: 0, added: 0, updated: 0, deleted: 0 };

  try {
    if (!account.initial_sync_done) {
      const r = await initialPass(repo, gmail, account, prefs.initial_sync_days, max, c);
      await repo.finishSync(syncId, r.hasMore ? 'partial' : 'success', c);
      return { kind, ...c, hasMore: r.hasMore, status: r.hasMore ? 'partial' : 'success' };
    }
    try {
      const hasMore = await incrementalPass(repo, gmail, account, max, c);
      await repo.finishSync(syncId, hasMore ? 'partial' : 'success', c);
      return { kind, ...c, hasMore, status: hasMore ? 'partial' : 'success' };
    } catch (e) {
      if (e instanceof GmailApiError && e.status === 404) {
        // historyId expirado: recomeça a varredura completa (upsert evita duplicatas)
        log.warn('sync.history_expired', { account: account.id });
        await repo.updateAccount(account.id, { initial_sync_done: false, initial_sync_page_token: null, history_id: null });
        await repo.finishSync(syncId, 'partial', c, 'history_expired');
        const fresh = { ...account, initial_sync_done: false, initial_sync_page_token: null, history_id: null };
        const resyncId = await repo.startSync(account.user_id, account.id, 'full_resync');
        const r = await initialPass(repo, gmail, fresh, prefs.initial_sync_days, max, c);
        await repo.finishSync(resyncId, r.hasMore ? 'partial' : 'success', c);
        return { kind: 'full_resync', ...c, hasMore: r.hasMore, status: r.hasMore ? 'partial' : 'success' };
      }
      throw e;
    }
  } catch (e) {
    if (e instanceof ReauthRequiredError) {
      await repo.updateAccount(account.id, { status: 'reauth_required', last_error: 'Autorização expirada. Reconecte o Gmail.' });
      await repo.finishSync(syncId, 'error', c, 'reauth_required');
      return { kind, ...c, hasMore: false, status: 'reauth_required' };
    }
    const code = errorCode(e);
    log.error('sync.failed', { account: account.id, code });
    await repo.updateAccount(account.id, { last_error: `Falha na sincronização (${code}). Tentaremos novamente.` });
    await repo.finishSync(syncId, 'error', c, code);
    return { kind, ...c, hasMore: false, status: 'error' };
  }
}

async function initialPass(repo: Repo, gmail: GmailClient, account: AccountRow, days: number, max: number, c: SyncCounters) {
  let historyId = account.history_id;
  if (!historyId) {
    // marca o ponto de partida ANTES de listar: mudanças durante a varredura entram no incremental
    const profile = await gmail.getProfile();
    historyId = profile.historyId;
    await repo.updateAccount(account.id, { history_id: historyId, messages_total: profile.messagesTotal });
  }
  const q = days > 0 ? `newer_than:${days}d` : undefined;
  let pageToken = account.initial_sync_page_token ?? undefined;
  while (c.fetched < max) {
    const page = await gmail.listMessages({ q, pageToken, maxResults: Math.min(100, max - c.fetched) });
    const ids = (page.messages ?? []).map((m) => m.id);
    if (ids.length) await fetchAndStore(repo, gmail, account, ids, c);
    pageToken = page.nextPageToken;
    await repo.updateAccount(account.id, { initial_sync_page_token: pageToken ?? null });
    if (!pageToken) {
      await repo.updateAccount(account.id, { initial_sync_done: true, last_sync_at: new Date().toISOString(), last_error: null, status: 'connected' });
      return { hasMore: false };
    }
  }
  await repo.updateAccount(account.id, { last_sync_at: new Date().toISOString(), last_error: null });
  return { hasMore: true };
}

async function incrementalPass(repo: Repo, gmail: GmailClient, account: AccountRow, max: number, c: SyncCounters): Promise<boolean> {
  if (!account.history_id) throw new GmailApiError(404, 'no_history_id');
  const added = new Set<string>();
  const deleted = new Set<string>();
  const relabeled = new Map<string, string[]>();
  let pageToken: string | undefined;
  let latest = account.history_id;
  do {
    const page = await gmail.listHistory(account.history_id, pageToken);
    latest = page.historyId ?? latest;
    for (const h of page.history ?? []) {
      for (const a of h.messagesAdded ?? []) { added.add(a.message.id); deleted.delete(a.message.id); }
      for (const d of h.messagesDeleted ?? []) { deleted.add(d.message.id); added.delete(d.message.id); relabeled.delete(d.message.id); }
      for (const l of [...(h.labelsAdded ?? []), ...(h.labelsRemoved ?? [])]) {
        if (l.message.labelIds) relabeled.set(l.message.id, l.message.labelIds);
      }
    }
    pageToken = page.nextPageToken;
  } while (pageToken);

  if (deleted.size) c.deleted += await repo.deleteEmails(account.id, [...deleted]);

  // mensagens movidas para lixeira/spam somem da base (escopo = fora de spam/lixeira)
  for (const [id, labels] of relabeled) {
    if (added.has(id)) continue;
    if (labels.includes('TRASH') || labels.includes('SPAM')) { c.deleted += await repo.deleteEmails(account.id, [id]); continue; }
    if (await repo.updateLabels(account.id, id, labels)) c.updated++;
  }

  const ids = [...added].slice(0, max);
  if (ids.length) await fetchAndStore(repo, gmail, account, ids, c);
  const hasMore = added.size > ids.length;
  // só avança o cursor quando todas as novidades foram processadas
  await repo.updateAccount(account.id, {
    ...(hasMore ? {} : { history_id: latest }),
    last_sync_at: new Date().toISOString(), last_error: null, status: 'connected',
  });
  return hasMore;
}

async function fetchAndStore(repo: Repo, gmail: GmailClient, account: AccountRow, ids: string[], c: SyncCounters) {
  const { found } = await gmail.getMessages(ids);
  c.fetched += found.length;
  const parsed = found
    .filter((m) => !(m.labelIds ?? []).some((l) => l === 'TRASH' || l === 'SPAM' || l === 'DRAFT'))
    .map(parseMessage);
  // deduplicação dentro do lote
  const unique = [...new Map(parsed.map((p) => [p.gmailId, p])).values()];
  const r = await repo.upsertEmails(account.user_id, account.id, unique);
  c.added += r.added;
  c.updated += r.updated;
}
