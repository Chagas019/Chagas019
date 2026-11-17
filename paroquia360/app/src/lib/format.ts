export const TZ = 'America/Sao_Paulo';
export const ROLE_LABEL: Record<string, string> = {
  parish_admin: 'Administração', priest: 'Pároco', coordinator: 'Coordenação', pastoral_agent: 'Agente pastoral', volunteer: 'Voluntário',
};
export const TYPE_LABEL: Record<string, string> = {
  mass: 'Missa', meeting: 'Reunião', formation: 'Formação', retreat: 'Retiro', feast: 'Festa', procession: 'Procissão', special: 'Especial',
};
export const STATUS_LABEL: Record<string, string> = {
  pending: 'Sem resposta', confirmed: 'Confirmado', declined: 'Recusou', swap_requested: 'Pediu troca',
};
export const fmt = (iso: string, opt: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, ...opt }).format(new Date(iso));
export const fmtDay = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
export const fmtTime = (iso: string) => fmt(iso, { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
/** data (AAAA-MM-DD) e hora (HH:MM) no fuso de São Paulo (sem horário de verão desde 2019) → ISO */
export const toIso = (date: string, time: string) => new Date(`${date}T${time}:00-03:00`).toISOString();
export const initials = (name: string) => name.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase() || '?';
/** Só permite redirecionar para caminhos internos. */
export const safeNext = (v: unknown) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : '/');
export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
export const errMsg = (m?: string) => {
  if (!m) return 'Algo deu errado. Tente de novo.';
  if (m.includes('duplicate key') && m.includes('slug')) return 'Já existe uma paróquia com esse endereço. Escolha outro.';
  if (m.includes('duplicate key')) return 'Esse registro já existe.';
  if (m.includes('row-level security')) return 'Você não tem permissão para isso.';
  return m;
};
