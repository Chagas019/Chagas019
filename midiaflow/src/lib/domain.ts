import { parseISO } from 'date-fns';
import type { Member, Role, Schedule, ScheduleStatus, Slot, SlotStatus } from './types';
import { overlaps, periodOf } from './utils';

export const SLOT_STATUS: Record<SlotStatus, { label: string; tone: 'neon' | 'warn' | 'danger' | 'electric' }> = {
  confirmado: { label: 'Confirmado', tone: 'neon' },
  pendente: { label: 'Aguardando confirmação', tone: 'warn' },
  recusado: { label: 'Não poderá participar', tone: 'danger' },
  substituicao: { label: 'Pediu substituição', tone: 'electric' },
};

export const SCHEDULE_STATUS: Record<ScheduleStatus, { label: string; tone: 'neon' | 'warn' | 'danger' }> = {
  completa: { label: 'Escala completa', tone: 'neon' },
  aguardando: { label: 'Aguardando confirmação', tone: 'warn' },
  precisa: { label: 'Precisa de voluntário', tone: 'danger' },
};

/** Vaga aberta = sem pessoa, ou pessoa que recusou / pediu substituição. */
export const isOpenSlot = (s: Slot) => !s.memberId || s.status === 'recusado' || s.status === 'substituicao';

export function scheduleStatus(s: Schedule): ScheduleStatus {
  if (s.slots.length === 0 || s.slots.some(isOpenSlot)) return 'precisa';
  if (s.slots.every((x) => x.status === 'confirmado')) return 'completa';
  return 'aguardando';
}

export function coverage(s: Schedule) {
  const total = s.slots.length;
  const filled = s.slots.filter((x) => !isOpenSlot(x)).length;
  const confirmed = s.slots.filter((x) => x.status === 'confirmado' && x.memberId).length;
  return {
    total,
    filled,
    confirmed,
    open: total - filled,
    pct: total ? Math.round((filled / total) * 100) : 0,
    confirmedPct: total ? Math.round((confirmed / total) * 100) : 0,
  };
}

export interface Conflict {
  kind: 'mesma-escala' | 'horario' | 'disponibilidade' | 'inativo' | 'funcao';
  message: string;
  severity: 'alerta' | 'aviso';
}

/**
 * Verifica se designar `memberId` à vaga `slotId` de `draft` gera conflitos.
 * Não bloqueia: devolve alertas para o coordenador decidir.
 */
export function checkAssignment(
  draft: Pick<Schedule, 'id' | 'date' | 'start' | 'end' | 'slots'>,
  slotId: string,
  memberId: string,
  ctx: { schedules: Schedule[]; members: Member[]; roles: Role[] },
): Conflict[] {
  const out: Conflict[] = [];
  const member = ctx.members.find((m) => m.id === memberId);
  const slot = draft.slots.find((s) => s.id === slotId);
  if (!member || !slot) return out;
  const roleName = (id: string) => ctx.roles.find((r) => r.id === id)?.name ?? 'Função';

  if (member.status !== 'ativo') {
    out.push({ kind: 'inativo', severity: 'alerta', message: `${member.name} está ${member.status} na equipe.` });
  }
  if (!member.roleIds.includes(slot.roleId)) {
    out.push({ kind: 'funcao', severity: 'aviso', message: `${member.name} não tem ${roleName(slot.roleId)} entre suas funções.` });
  }

  // Mesma celebração: só pode acumular funções marcadas como compatíveis.
  const role = ctx.roles.find((r) => r.id === slot.roleId);
  for (const other of draft.slots) {
    if (other.id === slotId || other.memberId !== memberId) continue;
    const otherRole = ctx.roles.find((r) => r.id === other.roleId);
    const compatible =
      role?.compatibleWith.includes(other.roleId) || otherRole?.compatibleWith.includes(slot.roleId);
    if (!compatible) {
      out.push({
        kind: 'mesma-escala',
        severity: 'alerta',
        message: `${member.name} já está em ${roleName(other.roleId)} nesta celebração — função incompatível com ${roleName(slot.roleId)}.`,
      });
    }
  }

  // Outras escalas no mesmo horário.
  for (const s of ctx.schedules) {
    if (s.id === draft.id || s.date !== draft.date) continue;
    if (!overlaps(s.start, s.end, draft.start, draft.end)) continue;
    const hit = s.slots.find((x) => x.memberId === memberId && x.status !== 'recusado');
    if (hit) {
      out.push({
        kind: 'horario',
        severity: 'alerta',
        message: `${member.name} já está escalado(a) em “${s.title}” (${s.start}–${s.end}) como ${roleName(hit.roleId)}.`,
      });
    }
  }

  // Disponibilidade declarada.
  if (draft.date) {
    const wd = parseISO(draft.date).getDay();
    const av = member.availability;
    if (av.unavailableDates.includes(draft.date)) {
      out.push({ kind: 'disponibilidade', severity: 'alerta', message: `${member.name} marcou indisponibilidade nesta data.` });
    } else if (!av.weekdays.includes(wd) || (draft.start && !av.periods.includes(periodOf(draft.start)))) {
      out.push({ kind: 'disponibilidade', severity: 'aviso', message: `Fora da disponibilidade habitual de ${member.name}.` });
    }
  }
  return out;
}

/** Integrantes ativos que exercem a função e estão livres no horário, ordenados por disponibilidade. */
export function suggestMembers(
  draft: Pick<Schedule, 'id' | 'date' | 'start' | 'end' | 'slots'>,
  slotId: string,
  ctx: { schedules: Schedule[]; members: Member[]; roles: Role[] },
) {
  const slot = draft.slots.find((s) => s.id === slotId);
  if (!slot) return [];
  return ctx.members
    .filter((m) => m.status === 'ativo')
    .map((m) => ({ member: m, conflicts: checkAssignment(draft, slotId, m.id, ctx) }))
    .sort((a, b) => {
      const score = (x: typeof a) =>
        (x.member.roleIds.includes(slot.roleId) ? 0 : 10) +
        x.conflicts.filter((c) => c.severity === 'alerta').length * 5 +
        x.conflicts.length;
      return score(a) - score(b);
    });
}
