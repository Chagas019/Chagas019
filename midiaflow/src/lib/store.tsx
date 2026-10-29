import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { moveCard, normalizeBoard } from './board';
import { buildDemoData } from './demo-data';
import { fetchParish, RemoteError, respondRemote, saveContact, saveParish, subscribeParish, updateMyAvailability, updateMyCard, type Profile, type RemoteSnapshot } from './remote';
import type {
  AccessLevel,
  Announcement,
  AppData,
  BoardCard,
  BoardColumn,
  AppNotification,
  AuditEntry,
  Member,
  ParishEvent,
  Parish,
  Role,
  Schedule,
  SlotStatus,
} from './types';
import { uid } from './utils';

const KEY = 'midiaflow:local:v2';
const EXAMPLE_KEY = 'midiaflow:exemplo:v2';
const MODE_KEY = 'midiaflow:modo';

/** Exemplo com dados fictícios: só quando aberto com ?exemplo (fica ativo nesta aba). */
export function isExampleMode() {
  try {
    if (new URLSearchParams(location.search).has('exemplo')) sessionStorage.setItem(MODE_KEY, 'exemplo');
    return sessionStorage.getItem(MODE_KEY) === 'exemplo';
  } catch {
    return false;
  }
}

export function exitExample() {
  try {
    sessionStorage.removeItem(MODE_KEY);
  } catch {
    /* ok */
  }
  location.assign('/');
}

/** Dados deste aparelho; null = primeiro acesso (mostra a configuração inicial). */
function load(): AppData | null {
  const example = isExampleMode();
  try {
    const raw = localStorage.getItem(example ? EXAMPLE_KEY : KEY);
    if (raw) {
      const d = JSON.parse(raw) as AppData;
      return { ...d, board: normalizeBoard(d.board) };
    }
  } catch {
    /* armazenamento indisponível */
  }
  return example ? buildDemoData() : null;
}

export function clearLocalData() {
  try {
    localStorage.removeItem(isExampleMode() ? EXAMPLE_KEY : KEY);
  } catch {
    /* ok */
  }
}

export type Permission =
  | 'manage:parish'
  | 'manage:users'
  | 'manage:schedules'
  | 'manage:team'
  | 'manage:events'
  | 'view:contacts'
  | 'view:reports'
  | 'manage:board';

const MATRIX: Record<AccessLevel, Permission[]> = {
  admin: ['manage:parish', 'manage:users', 'manage:schedules', 'manage:team', 'manage:events', 'view:contacts', 'view:reports', 'manage:board'],
  coordenador: ['manage:schedules', 'manage:team', 'manage:events', 'view:contacts', 'view:reports', 'manage:board'],
  integrante: [],
};

export const ACCESS_LABEL: Record<AccessLevel, string> = {
  admin: 'Administrador',
  coordenador: 'Coordenador',
  integrante: 'Integrante',
};

/** Sessão real (Supabase). Sem ela, o app roda em modo demonstração. */
export interface RemoteSession {
  profile: Profile;
  initial: RemoteSnapshot;
}

export type SyncState = 'demo' | 'saved' | 'saving' | 'error';

const readKey = (memberId: string) => `midiaflow:lidas:${memberId}`;
function readIds(memberId: string): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(readKey(memberId)) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
/** No modo real, "lida" é pessoal: fica neste aparelho, não no banco compartilhado. */
const withRead = (d: AppData, ids: Set<string>): AppData => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: ids.has(n.id) })) });

interface Store extends AppData {
  me: Member;
  mode: 'demo' | 'remote';
  sync: SyncState;
  refresh: () => Promise<void>;
  can: (p: Permission) => boolean;
  saveSchedule: (s: Schedule) => void;
  duplicateSchedule: (id: string) => Schedule | undefined;
  deleteSchedule: (id: string) => void;
  assign: (scheduleId: string, slotId: string, memberId: string | null) => void;
  respond: (scheduleId: string, slotId: string, status: SlotStatus, note?: string) => void;
  saveMember: (m: Member) => void;
  saveRole: (r: Role) => void;
  deleteRole: (id: string) => boolean;
  saveEvent: (e: ParishEvent) => void;
  deleteEvent: (id: string) => void;
  toggleChecklist: (eventId: string, itemId: string) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  addAnnouncement: (a: Omit<Announcement, 'id' | 'createdAt' | 'author'>) => void;
  /** Quadro: a coordenação edita tudo; o integrante move e marca o checklist dos próprios cartões. */
  canWorkOn: (card: BoardCard) => boolean;
  saveCard: (c: BoardCard) => void;
  deleteCard: (id: string) => void;
  moveCard: (cardId: string, columnId: string, index: number) => void;
  toggleCardItem: (cardId: string, itemId: string) => void;
  saveColumns: (cols: BoardColumn[]) => void;
  switchUser: (memberId: string) => void;
  updateParish: (p: Parish) => void;
  resetDemo: () => void;
  importData: (d: AppData) => void;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children, remote, setup }: { children: ReactNode; remote?: RemoteSession; setup?: (done: (d: AppData) => void) => ReactNode }) {
  const [local, setLocal] = useState<AppData | null>(() => (remote ? null : load()));
  if (remote) return <StoreInner remote={remote}>{children}</StoreInner>;
  if (!local) return <>{setup?.(setLocal)}</>;
  return <StoreInner initialLocal={local}>{children}</StoreInner>;
}

function StoreInner({ children, remote, initialLocal }: { children: ReactNode; remote?: RemoteSession; initialLocal?: AppData }) {
  const [data, setData] = useState<AppData>(() => (remote ? withRead(remote.initial.data, readIds(remote.profile.member_id)) : initialLocal!));
  const [sync, setSync] = useState<SyncState>(remote ? 'saved' : 'demo');

  useEffect(() => {
    if (remote) return;
    try {
      localStorage.setItem(data.example ? EXAMPLE_KEY : KEY, JSON.stringify(data));
    } catch {
      /* sem persistência local: os dados valem até recarregar a página */
    }
  }, [data, remote]);

  const me = data.members.find((m) => m.id === data.currentUserId) ?? data.members[0];
  const isStaff = me ? me.access !== 'integrante' : false;

  /* ---------- Sincronização com o banco (modo real) ---------- */
  const dataRef = useRef(data);
  dataRef.current = data;
  const versionRef = useRef(remote?.initial.version ?? 0);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const chainRef = useRef<Promise<void>>(Promise.resolve());

  const refresh = useCallback(async () => {
    if (!remote) return;
    try {
      const snap = await fetchParish(remote.profile);
      if (dirtyRef.current) return; // há alteração local esperando: ela vence e será salva
      versionRef.current = snap.version;
      setData(withRead(snap.data, readIds(remote.profile.member_id)));
    } catch (e) {
      setSync('error');
      toast.error((e as Error).message);
    }
  }, [remote]);

  const flush = useCallback((): Promise<void> => {
    if (!remote) return Promise.resolve();
    clearTimeout(timerRef.current);
    chainRef.current = chainRef.current.then(async () => {
      if (!dirtyRef.current) return;
      dirtyRef.current = false;
      setSync('saving');
      try {
        versionRef.current = await saveParish(dataRef.current, versionRef.current);
        setSync('saved');
      } catch (e) {
        const err = e as RemoteError;
        toast.error(err.message);
        if (err.code === 'version_conflict' || err.code === 'forbidden' || err.code === 'last_admin' || err.code === 'member_with_account_removed') {
          await refresh();
          setSync('saved');
        } else {
          dirtyRef.current = true;
          setSync('error');
        }
      }
    });
    return chainRef.current;
  }, [remote, refresh]);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    setSync('saving');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush(), 700);
  }, [flush]);

  useEffect(() => {
    if (!remote) return;
    const off = subscribeParish(remote.profile.parish_id, (v) => {
      if (v > versionRef.current && !dirtyRef.current) void refresh();
    });
    const onFocus = () => { if (!dirtyRef.current) void refresh(); };
    const onLeave = () => { if (dirtyRef.current) void flush(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('beforeunload', onLeave);
    document.addEventListener('visibilitychange', onLeave);
    return () => {
      off();
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('beforeunload', onLeave);
      document.removeEventListener('visibilitychange', onLeave);
    };
  }, [remote, refresh, flush]);

  const mutate = useCallback(
    (fn: (d: AppData) => AppData, log?: Omit<AuditEntry, 'id' | 'at' | 'actor'>, notify?: Omit<AppNotification, 'id' | 'createdAt' | 'read'>, save = true) => {
      setData((d) => {
        const actor = d.members.find((m) => m.id === d.currentUserId)?.name ?? 'Sistema';
        let next = fn(d);
        if (log) next = { ...next, audit: [{ ...log, id: uid('au'), at: new Date().toISOString(), actor }, ...next.audit].slice(0, 300) };
        if (notify)
          next = { ...next, notifications: [{ ...notify, id: uid('n'), createdAt: new Date().toISOString(), read: false }, ...next.notifications] };
        return next;
      });
      // No modo real só a coordenação grava o estado inteiro; o resto usa funções específicas.
      if (remote && save && isStaff) scheduleSave();
    },
    [remote, isStaff, scheduleSave],
  );

  const store = useMemo<Store>(() => {
    const roleName = (id: string) => data.roles.find((r) => r.id === id)?.name ?? 'função';
    const memberName = (id: string | null) => data.members.find((m) => m.id === id)?.name ?? 'ninguém';

    const markIds = (ids: string[]) => {
      if (!remote) return;
      const set = readIds(remote.profile.member_id);
      ids.forEach((i) => set.add(i));
      try {
        localStorage.setItem(readKey(remote.profile.member_id), JSON.stringify([...set].slice(-500)));
      } catch {
        /* sem armazenamento */
      }
    };

    return {
      ...data,
      me,
      mode: remote ? 'remote' : 'demo',
      sync,
      refresh,
      can: (p) => MATRIX[me.access].includes(p),

      saveSchedule: (s) => {
        const exists = data.schedules.some((x) => x.id === s.id);
        mutate(
          (d) => ({ ...d, schedules: exists ? d.schedules.map((x) => (x.id === s.id ? s : x)) : [...d.schedules, s] }),
          { action: exists ? 'editou' : 'criou', entity: 'escala', entityId: s.id, summary: `${exists ? 'Editou' : 'Criou'} a escala “${s.title}” (${s.date.split('-').reverse().join('/')}).` },
          exists ? undefined : { kind: 'escala', title: 'Nova escala criada', body: `${s.title} — ${s.date.split('-').reverse().join('/')} às ${s.start}`, scheduleId: s.id },
        );
      },

      duplicateSchedule: (id) => {
        const src = data.schedules.find((s) => s.id === id);
        if (!src) return;
        const copy: Schedule = {
          ...src,
          id: uid('e'),
          title: `${src.title} (cópia)`,
          createdAt: new Date().toISOString(),
          slots: src.slots.map((sl) => ({ ...sl, id: uid('s'), status: 'pendente', note: undefined, respondedAt: undefined })),
        };
        mutate((d) => ({ ...d, schedules: [...d.schedules, copy] }), {
          action: 'duplicou', entity: 'escala', entityId: copy.id, summary: `Duplicou a escala “${src.title}”.`,
        });
        return copy;
      },

      deleteSchedule: (id) => {
        const src = data.schedules.find((s) => s.id === id);
        mutate((d) => ({ ...d, schedules: d.schedules.filter((s) => s.id !== id) }), {
          action: 'excluiu', entity: 'escala', entityId: id, summary: `Excluiu a escala “${src?.title ?? id}”.`,
        });
      },

      assign: (scheduleId, slotId, memberId) => {
        const s = data.schedules.find((x) => x.id === scheduleId);
        const slot = s?.slots.find((x) => x.id === slotId);
        mutate(
          (d) => ({
            ...d,
            schedules: d.schedules.map((x) =>
              x.id !== scheduleId
                ? x
                : { ...x, slots: x.slots.map((sl) => (sl.id === slotId ? { ...sl, memberId, status: 'pendente', note: undefined, respondedAt: undefined } : sl)) },
            ),
          }),
          {
            action: 'designou', entity: 'escala', entityId: scheduleId,
            summary: memberId
              ? `Designou ${memberName(memberId)} para ${roleName(slot?.roleId ?? '')} em “${s?.title}”.`
              : `Liberou a vaga de ${roleName(slot?.roleId ?? '')} em “${s?.title}”.`,
          },
        );
      },

      respond: (scheduleId, slotId, status, note) => {
        const s = data.schedules.find((x) => x.id === scheduleId);
        const slot = s?.slots.find((x) => x.id === slotId);
        const who = memberName(slot?.memberId ?? null);
        const verb = status === 'confirmado' ? 'confirmou presença' : status === 'recusado' ? 'não poderá participar' : 'pediu substituição';
        if (remote) {
          // Atualiza na tela na hora e confirma no banco (que registra notificação e histórico).
          mutate(
            (d) => ({
              ...d,
              schedules: d.schedules.map((x) =>
                x.id !== scheduleId
                  ? x
                  : { ...x, slots: x.slots.map((sl) => (sl.id === slotId ? { ...sl, status, note, respondedAt: new Date().toISOString() } : sl)) },
              ),
            }),
            undefined,
            undefined,
            false,
          );
          void (async () => {
            try {
              await flush();
              versionRef.current = await respondRemote(scheduleId, slotId, status, note);
              await refresh();
            } catch (e) {
              toast.error((e as Error).message);
              await refresh();
            }
          })();
          return;
        }
        mutate(
          (d) => ({
            ...d,
            schedules: d.schedules.map((x) =>
              x.id !== scheduleId
                ? x
                : { ...x, slots: x.slots.map((sl) => (sl.id === slotId ? { ...sl, status, note, respondedAt: new Date().toISOString() } : sl)) },
            ),
          }),
          { action: 'respondeu', entity: 'escala', entityId: scheduleId, summary: `${who} ${verb} em “${s?.title}” (${roleName(slot?.roleId ?? '')}).` },
          {
            kind: status === 'confirmado' ? 'confirmacao' : status === 'recusado' ? 'recusa' : 'substituicao',
            title: status === 'confirmado' ? 'Presença confirmada' : 'Vaga precisa de substituição',
            body: `${who} ${verb} — ${roleName(slot?.roleId ?? '')}, ${s?.title}.${note ? ` “${note}”` : ''}`,
            scheduleId,
          },
        );
      },

      saveMember: (m) => {
        const exists = data.members.some((x) => x.id === m.id);
        const before = data.members.find((x) => x.id === m.id);
        if (remote && !isStaff) {
          // Integrante: só a própria disponibilidade (e o próprio contato).
          if (m.id !== me.id) return;
          mutate((d) => ({ ...d, members: d.members.map((x) => (x.id === m.id ? { ...x, availability: m.availability, email: m.email, phone: m.phone } : x)) }), undefined, undefined, false);
          void (async () => {
            try {
              await updateMyAvailability(m.availability);
              if (before && (before.email !== m.email || before.phone !== m.phone)) await saveContact(remote.profile.parish_id, m.id, m.email, m.phone);
              await refresh();
            } catch (e) {
              toast.error((e as Error).message);
              await refresh();
            }
          })();
          return;
        }
        if (remote && (!before || before.email !== m.email || before.phone !== m.phone)) {
          saveContact(remote.profile.parish_id, m.id, m.email, m.phone).catch((e) => toast.error((e as Error).message));
        }
        mutate(
          (d) => ({ ...d, members: exists ? d.members.map((x) => (x.id === m.id ? m : x)) : [...d.members, m] }),
          { action: exists ? 'editou' : 'criou', entity: 'integrante', entityId: m.id, summary: `${exists ? 'Atualizou' : 'Cadastrou'} ${m.name}.` },
        );
      },

      saveRole: (r) => {
        const exists = data.roles.some((x) => x.id === r.id);
        mutate(
          (d) => ({ ...d, roles: exists ? d.roles.map((x) => (x.id === r.id ? r : x)) : [...d.roles, r] }),
          { action: exists ? 'editou' : 'criou', entity: 'função', entityId: r.id, summary: `${exists ? 'Editou' : 'Criou'} a função ${r.name}.` },
        );
      },

      deleteRole: (id) => {
        const inUse = data.schedules.some((s) => s.slots.some((sl) => sl.roleId === id));
        if (inUse) return false;
        mutate(
          (d) => ({
            ...d,
            roles: d.roles.filter((r) => r.id !== id).map((r) => ({ ...r, compatibleWith: r.compatibleWith.filter((c) => c !== id) })),
            members: d.members.map((m) => ({ ...m, roleIds: m.roleIds.filter((x) => x !== id) })),
          }),
          { action: 'excluiu', entity: 'função', entityId: id, summary: `Removeu a função ${roleName(id)}.` },
        );
        return true;
      },

      saveEvent: (e) => {
        const exists = data.events.some((x) => x.id === e.id);
        mutate(
          (d) => ({ ...d, events: exists ? d.events.map((x) => (x.id === e.id ? e : x)) : [...d.events, e] }),
          { action: exists ? 'editou' : 'criou', entity: 'evento', entityId: e.id, summary: `${exists ? 'Editou' : 'Criou'} o evento ${e.title}.` },
        );
      },

      deleteEvent: (id) => {
        const e = data.events.find((x) => x.id === id);
        mutate((d) => ({ ...d, events: d.events.filter((x) => x.id !== id) }), {
          action: 'excluiu', entity: 'evento', entityId: id, summary: `Excluiu o evento ${e?.title ?? id}.`,
        });
      },

      toggleChecklist: (eventId, itemId) =>
        mutate((d) => ({
          ...d,
          events: d.events.map((e) =>
            e.id !== eventId ? e : { ...e, checklist: e.checklist.map((c) => (c.id === itemId ? { ...c, done: !c.done } : c)) },
          ),
        })),

      markAllRead: () => {
        markIds(data.notifications.map((n) => n.id));
        mutate((d) => ({ ...d, notifications: d.notifications.map((n) => ({ ...n, read: true })) }), undefined, undefined, false);
      },
      markRead: (id) => {
        markIds([id]);
        mutate((d) => ({ ...d, notifications: d.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }), undefined, undefined, false);
      },

      addAnnouncement: (a) =>
        mutate(
          (d) => ({
            ...d,
            announcements: [{ ...a, id: uid('a'), createdAt: new Date().toISOString(), author: me.name }, ...d.announcements],
          }),
          { action: 'criou', entity: 'aviso', entityId: '', summary: `Publicou o aviso “${a.title}”.` },
          { kind: 'aviso', title: a.title, body: a.body },
        ),

      canWorkOn: (card) => isStaff || card.assigneeIds.includes(me.id),

      saveCard: (c) => {
        if (!isStaff) return;
        const exists = data.board.cards.some((x) => x.id === c.id);
        mutate(
          (d) => ({ ...d, board: { ...d.board, cards: exists ? d.board.cards.map((x) => (x.id === c.id ? c : x)) : [...d.board.cards, c] } }),
          { action: exists ? 'editou' : 'criou', entity: 'quadro', entityId: c.id, summary: `${exists ? 'Editou' : 'Criou'} a tarefa “${c.title}”.` },
          exists || !c.assigneeIds.length ? undefined : { kind: 'sistema', title: 'Nova tarefa no quadro', body: `${c.title} — ${c.assigneeIds.map(memberName).join(', ')}` },
        );
      },

      deleteCard: (id) => {
        if (!isStaff) return;
        const c = data.board.cards.find((x) => x.id === id);
        mutate((d) => ({ ...d, board: { ...d.board, cards: d.board.cards.filter((x) => x.id !== id) } }), {
          action: 'excluiu', entity: 'quadro', entityId: id, summary: `Excluiu a tarefa “${c?.title ?? id}”.`,
        });
      },

      moveCard: (cardId, columnId, index) => {
        const c = data.board.cards.find((x) => x.id === cardId);
        if (!c || !(isStaff || c.assigneeIds.includes(me.id))) return;
        const col = data.board.columns.find((x) => x.id === columnId)?.title ?? '';
        const log = c.columnId !== columnId ? { action: 'editou' as const, entity: 'quadro' as const, entityId: cardId, summary: `Moveu “${c.title}” para ${col}.` } : undefined;
        if (remote && !isStaff) {
          mutate((d) => ({ ...d, board: moveCard(d.board, cardId, columnId, index) }), undefined, undefined, false);
          const next = data.board.cards.find((x) => x.id === cardId)!;
          void updateMyCard(cardId, columnId, next.checklist)
            .then((v) => { versionRef.current = v; return refresh(); })
            .catch(async (e) => { toast.error((e as Error).message); await refresh(); });
          return;
        }
        mutate((d) => ({ ...d, board: moveCard(d.board, cardId, columnId, index) }), log);
      },

      toggleCardItem: (cardId, itemId) => {
        const c = data.board.cards.find((x) => x.id === cardId);
        if (!c || !(isStaff || c.assigneeIds.includes(me.id))) return;
        const checklist = c.checklist.map((k) => (k.id === itemId ? { ...k, done: !k.done } : k));
        const apply = (d: AppData) => ({ ...d, board: { ...d.board, cards: d.board.cards.map((x) => (x.id === cardId ? { ...x, checklist } : x)) } });
        if (remote && !isStaff) {
          mutate(apply, undefined, undefined, false);
          void updateMyCard(cardId, c.columnId, checklist)
            .then((v) => { versionRef.current = v; return refresh(); })
            .catch(async (e) => { toast.error((e as Error).message); await refresh(); });
          return;
        }
        mutate(apply);
      },

      saveColumns: (cols) => {
        if (!isStaff || !cols.length) return;
        const ids = new Set(cols.map((c) => c.id));
        mutate(
          (d) => ({ ...d, board: { ...d.board, columns: cols, cards: d.board.cards.map((c) => (ids.has(c.columnId) ? c : { ...c, columnId: cols[0].id })) } }),
          { action: 'editou', entity: 'quadro', entityId: '', summary: 'Alterou as colunas do quadro.' },
        );
      },

      switchUser: (memberId) => { if (!remote) setData((d) => ({ ...d, currentUserId: memberId })); },

      updateParish: (p) =>
        mutate((d) => ({ ...d, parish: p }), { action: 'editou', entity: 'configuração', entityId: '', summary: 'Atualizou os dados da paróquia.' }),

      resetDemo: () => {
        if (remote) return;
        clearLocalData();
        location.assign('/');
      },
      importData: (d) => {
        if (remote) return;
        setData({ ...d, board: normalizeBoard(d.board), example: data.example });
      },
    };
  }, [data, me, mutate, remote, sync, refresh, flush, isStaff]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fora do StoreProvider');
  return s;
}
