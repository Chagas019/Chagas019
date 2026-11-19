// Logs estruturados SEM conteúdo sensível: nunca registrar corpo de e-mail, assunto,
// tokens ou endereços. Apenas ids internos, contadores e códigos de erro.
type Fields = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE = /(token|secret|password|authorization|body|subject|email|content)/i;

function clean(fields: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(fields)) out[k] = SENSITIVE.test(k) ? '[redacted]' : v;
  return out;
}

export const log = {
  info: (event: string, fields: Fields = {}) => console.log(JSON.stringify({ level: 'info', event, ...clean(fields) })),
  warn: (event: string, fields: Fields = {}) => console.warn(JSON.stringify({ level: 'warn', event, ...clean(fields) })),
  error: (event: string, fields: Fields = {}) => console.error(JSON.stringify({ level: 'error', event, ...clean(fields) })),
};

/** Mensagem de erro segura para log/UI (sem stack nem dados). */
export function errorCode(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e && typeof (e as { code: unknown }).code === 'string') return (e as { code: string }).code;
  if (e instanceof Error) return e.name === 'Error' ? e.message.slice(0, 120) : e.name;
  return 'unknown_error';
}
