import type { AppData } from './types';
import { toISODate } from './utils';

/** Escalas de um servo, levadas no próprio link (depois do #, que não vai para o servidor). */
export interface ServoSnapshot {
  v: 1;
  /** Paróquia e PASCOM */
  p: string;
  pc: string;
  /** Nome do servo */
  n: string;
  /** Quando o link foi gerado */
  at: string;
  s: ServoItem[];
  /** Tarefas do quadro ainda não concluídas: título, etapa e prazo */
  tk?: { t: string; col: string; due?: string }[];
}

export interface ServoItem {
  t: string; // celebração
  d: string; // yyyy-MM-dd
  st: string;
  en: string;
  l: string; // local
  r: string; // função do servo
  c: string[]; // quem mais serve: "Nome · Função"
  o?: string; // observações
  kn?: string; // responsável
  kp?: string; // telefone do responsável (só dígitos)
}

export const SERVO_KEY = 'midiaflow:servo:v1';

export function buildSnapshot(data: Pick<AppData, 'parish' | 'members' | 'roles' | 'schedules'> & Partial<Pick<AppData, 'board'>>, memberId: string): ServoSnapshot {
  const today = toISODate(new Date());
  const member = data.members.find((m) => m.id === memberId);
  const name = (id: string | null) => data.members.find((m) => m.id === id)?.name ?? '';
  const role = (id: string) => data.roles.find((r) => r.id === id)?.name ?? 'Função';
  const items: ServoItem[] = data.schedules
    .filter((s) => s.date >= today)
    .flatMap((s) =>
      s.slots
        .filter((sl) => sl.memberId === memberId && sl.status !== 'recusado')
        .map((sl) => {
          const coord = data.members.find((m) => m.id === s.coordinatorId);
          const item: ServoItem = {
            t: s.title, d: s.date, st: s.start, en: s.end, l: s.location, r: role(sl.roleId),
            c: s.slots.filter((x) => x.id !== sl.id && x.memberId && x.memberId !== memberId).map((x) => `${name(x.memberId)} · ${role(x.roleId)}`),
          };
          if (s.notes.trim()) item.o = s.notes.trim();
          if (coord && coord.id !== memberId) {
            item.kn = coord.name;
            const digits = coord.phone.replace(/\D/g, '');
            if (digits.length >= 10) item.kp = digits.length <= 11 ? `55${digits}` : digits;
          }
          return item;
        }),
    )
    .sort((a, b) => (a.d + a.st).localeCompare(b.d + b.st));
  const cols = data.board?.columns ?? [];
  const last = cols[cols.length - 1]?.id;
  const tk = (data.board?.cards ?? [])
    .filter((c) => c.assigneeIds.includes(memberId) && c.columnId !== last)
    .map((c) => ({ t: c.title, col: cols.find((x) => x.id === c.columnId)?.title ?? '', ...(c.due ? { due: c.due } : {}) }));
  const snap: ServoSnapshot = { v: 1, p: data.parish.name, pc: data.parish.pascomName, n: member?.name ?? '', at: new Date().toISOString(), s: items };
  if (tk.length) snap.tk = tk;
  return snap;
}

const toB64url = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** "z" = comprimido (links menores no WhatsApp); "j" = JSON puro, para navegadores antigos. */
export async function encodeSnapshot(snap: ServoSnapshot) {
  const raw = new TextEncoder().encode(JSON.stringify(snap));
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64url(await pipe(raw, new CompressionStream('deflate-raw')));
  return 'j' + toB64url(raw);
}

export async function decodeSnapshot(code: string): Promise<ServoSnapshot | null> {
  try {
    let bytes = fromB64url(code.slice(1));
    if (code[0] === 'z') bytes = await pipe(bytes, new DecompressionStream('deflate-raw'));
    else if (code[0] !== 'j') return null;
    const snap = JSON.parse(new TextDecoder().decode(bytes)) as ServoSnapshot;
    return snap?.v === 1 && Array.isArray(snap.s) && typeof snap.n === 'string' ? snap : null;
  } catch {
    return null;
  }
}

export async function servoLink(snap: ServoSnapshot, origin = location.origin) {
  return `${origin}/servo#d=${await encodeSnapshot(snap)}`;
}

/** Arquivo .ics para colocar as escalas na agenda do celular. */
export function toICS(snap: ServoSnapshot) {
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const dt = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = snap.s.map((x, i) => [
    'BEGIN:VEVENT',
    `UID:midiaflow-${x.d}-${x.st.replace(':', '')}-${i}@midiaflow`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${dt(x.d, x.st)}`,
    `DTEND:${dt(x.d, x.en || x.st)}`,
    `SUMMARY:${esc(`${x.t} · ${x.r}`)}`,
    x.l ? `LOCATION:${esc(x.l)}` : '',
    `DESCRIPTION:${esc([`Função: ${x.r}`, x.c.length ? `Equipe: ${x.c.join(', ')}` : '', x.o ?? ''].filter(Boolean).join('\n'))}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(x.t)}`, 'END:VALARM',
    'END:VEVENT',
  ].filter(Boolean).join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MidiaFlow//Escalas//PT-BR', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR'].join('\r\n');
}
