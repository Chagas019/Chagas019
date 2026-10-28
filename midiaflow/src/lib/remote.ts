import { DEFAULT_ROLES } from './demo-data';
import { supabase } from './supabase';
import type { AccessLevel, AppData, Member } from './types';

/** Mensagens amigáveis para os erros levantados pelas funções do banco. */
const ERRORS: Record<string, string> = {
  not_authenticated: 'Sua sessão expirou. Entre novamente.',
  already_member: 'Esta conta já faz parte de uma paróquia.',
  invalid_code: 'Código de convite inválido. Confira com a coordenação.',
  invalid_name: 'Informe seu nome completo.',
  invalid_roles: 'Funções inválidas.',
  forbidden: 'Você não tem permissão para esta ação.',
  not_member: 'Sua conta ainda não está ligada a uma paróquia.',
  version_conflict: 'Outra pessoa alterou os dados agora há pouco. Recarregamos a versão mais recente.',
  invalid_data: 'Dados inválidos.',
  too_large: 'Os dados ficaram grandes demais para salvar.',
  last_admin: 'A paróquia precisa de pelo menos um administrador.',
  member_with_account_removed: 'Não é possível remover um integrante que tem conta. Marque como inativo.',
  not_found: 'Escala não encontrada.',
  not_your_slot: 'Esta vaga não é sua.',
  invalid_status: 'Resposta inválida.',
};

export class RemoteError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function fail(err: { message?: string } | null): never {
  const raw = err?.message ?? 'erro';
  const code = Object.keys(ERRORS).find((k) => raw.includes(k)) ?? 'unknown';
  const offline = /fetch|network|Failed to fetch/i.test(raw);
  throw new RemoteError(code, ERRORS[code] ?? (offline ? 'Sem conexão com o servidor. Verifique a internet.' : 'Não foi possível concluir. Tente novamente.'));
}

function db() {
  if (!supabase) throw new RemoteError('not_configured', 'Banco de dados não configurado.');
  return supabase;
}

export interface Profile {
  id: string;
  parish_id: string;
  member_id: string;
  access: AccessLevel;
  full_name: string;
}

export interface RemoteSnapshot {
  data: AppData;
  version: number;
}

type StoredData = Omit<AppData, 'currentUserId' | 'demo'>;

export async function fetchProfile(): Promise<Profile | null> {
  const s = db();
  const { data: auth } = await s.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await s.from('profiles').select('id, parish_id, member_id, access, full_name').eq('id', auth.user.id).maybeSingle();
  if (error) fail(error);
  return (data as Profile) ?? null;
}

/** Lê o estado da paróquia e junta os contatos que o usuário pode ver. */
export async function fetchParish(profile: Profile): Promise<RemoteSnapshot> {
  const s = db();
  const [{ data: row, error }, { data: contacts, error: cErr }] = await Promise.all([
    s.from('parish_data').select('data, version').eq('parish_id', profile.parish_id).single(),
    s.from('member_contacts').select('member_id, email, phone').eq('parish_id', profile.parish_id),
  ]);
  if (error) fail(error);
  if (cErr) fail(cErr);
  const stored = row.data as StoredData;
  const byId = new Map((contacts ?? []).map((c) => [c.member_id as string, c as { email: string; phone: string }]));
  const members: Member[] = (stored.members ?? []).map((m) => ({ ...m, email: byId.get(m.id)?.email ?? '', phone: byId.get(m.id)?.phone ?? '' }));
  return {
    version: row.version as number,
    data: {
      parish: stored.parish,
      roles: stored.roles ?? [],
      members,
      schedules: stored.schedules ?? [],
      events: stored.events ?? [],
      notifications: stored.notifications ?? [],
      audit: stored.audit ?? [],
      announcements: stored.announcements ?? [],
      currentUserId: profile.member_id,
      demo: true,
    },
  };
}

export async function saveParish(data: AppData, version: number): Promise<number> {
  const { currentUserId: _c, demo: _d, ...rest } = data;
  void _c;
  void _d;
  const payload: StoredData = { ...rest, members: rest.members.map((m) => ({ ...m, email: '', phone: '' })) };
  const { data: v, error } = await db().rpc('save_parish_data', { p_data: payload, p_version: version });
  if (error) fail(error);
  return v as number;
}

export async function saveContact(parishId: string, memberId: string, email: string, phone: string) {
  const { error } = await db().from('member_contacts').upsert({ parish_id: parishId, member_id: memberId, email: email.trim(), phone: phone.trim() });
  if (error) fail(error);
}

export async function respondRemote(scheduleId: string, slotId: string, status: string, note?: string): Promise<number> {
  const { data, error } = await db().rpc('respond_assignment', { p_schedule_id: scheduleId, p_slot_id: slotId, p_status: status, p_note: note ?? null });
  if (error) fail(error);
  return data as number;
}

export async function updateMyAvailability(av: Member['availability']): Promise<number> {
  const { data, error } = await db().rpc('update_my_availability', { p_availability: av });
  if (error) fail(error);
  return data as number;
}

export async function createParish(p: { name: string; city: string; pascom: string; fullName: string }) {
  const { error } = await db().rpc('create_parish', { p_name: p.name, p_city: p.city, p_pascom: p.pascom, p_full_name: p.fullName, p_roles: DEFAULT_ROLES });
  if (error) fail(error);
}

export async function joinParish(code: string, fullName: string) {
  const { error } = await db().rpc('join_parish', { p_code: code, p_full_name: fullName });
  if (error) fail(error);
}

export async function getInviteCode(): Promise<string> {
  const { data, error } = await db().rpc('get_invite_code');
  if (error) fail(error);
  return data as string;
}

export async function regenerateInviteCode(): Promise<string> {
  const { data, error } = await db().rpc('regenerate_invite_code');
  if (error) fail(error);
  return data as string;
}

export interface TrainingRow {
  done: string[];
  quiz: { score: number; at: string } | null;
}

export async function fetchTraining(): Promise<TrainingRow> {
  const s = db();
  const { data: auth } = await s.auth.getUser();
  const { data, error } = await s.from('training_progress').select('done, quiz').eq('user_id', auth.user?.id ?? '').maybeSingle();
  if (error) fail(error);
  return (data as TrainingRow) ?? { done: [], quiz: null };
}

export async function saveTraining(row: TrainingRow) {
  const s = db();
  const { data: auth } = await s.auth.getUser();
  if (!auth.user) return;
  const { error } = await s.from('training_progress').upsert({ user_id: auth.user.id, done: row.done, quiz: row.quiz, updated_at: new Date().toISOString() });
  if (error) fail(error);
}

export function subscribeParish(parishId: string, onChange: (version: number) => void) {
  const s = db();
  const ch = s
    .channel(`parish-${parishId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parish_data', filter: `parish_id=eq.${parishId}` }, (payload) => {
      onChange((payload.new as { version?: number }).version ?? 0);
    })
    .subscribe();
  return () => {
    s.removeChannel(ch);
  };
}
