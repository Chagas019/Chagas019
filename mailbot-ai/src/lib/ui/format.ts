export const PRIORITY_LABEL: Record<string, string> = { urgente: 'Urgente', importante: 'Importante', normal: 'Normal', baixa: 'Baixa prioridade', spam: 'Possível spam' };
export const CATEGORY_LABEL: Record<string, string> = { trabalho: 'Trabalho', financeiro: 'Financeiro', pessoal: 'Pessoal', compromissos: 'Compromissos', informativos: 'Informativo' };

export function fmtDateTime(iso: string, tz = 'America/Sao_Paulo') {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toLocaleDateString('pt-BR', { timeZone: tz }) === now.toLocaleDateString('pt-BR', { timeZone: tz });
  return sameDay
    ? d.toLocaleTimeString('pt-BR', { timeZone: tz, hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('pt-BR', { timeZone: tz, day: '2-digit', month: 'short' });
}

export function fmtFull(iso: string, tz = 'America/Sao_Paulo') {
  return new Date(iso).toLocaleString('pt-BR', { timeZone: tz, dateStyle: 'medium', timeStyle: 'short' });
}

export function relative(iso: string | null) {
  if (!iso) return 'nunca';
  const s = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'agora mesmo';
  if (s < 3600) return `há ${Math.round(s / 60)} min`;
  if (s < 86400) return `há ${Math.round(s / 3600)} h`;
  return `há ${Math.round(s / 86400)} d`;
}

const PALETTE = [['#8b5cf6', '#0a84ff'], ['#14b8a6', '#0a84ff'], ['#ff7a1a', '#ff2d87'], ['#ff2d87', '#8b5cf6'], ['#ffb020', '#ff7a1a'], ['#0a84ff', '#14b8a6']];
export function avatarStyle(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a1, a2] = PALETTE[h % PALETTE.length];
  return { '--a1': a1, '--a2': a2 } as React.CSSProperties;
}

export function initials(name: string) {
  return (name.trim()[0] ?? '?').toUpperCase();
}
