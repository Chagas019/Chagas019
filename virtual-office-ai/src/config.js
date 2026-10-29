// Configuração central. Tudo vem de variáveis de ambiente (ou do arquivo .env na raiz do módulo).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Carrega .env sem sobrescrever variáveis já definidas
export function loadEnvFile(file = path.join(ROOT, '.env')) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function getConfig(env = process.env) {
  const num = (v, d) => (v === undefined || v === '' || Number.isNaN(Number(v)) ? d : Number(v));
  return {
    port: num(env.PORT, 3210),
    dataDir: env.VOA_DATA_DIR || path.join(ROOT, 'data'),
    dbFile: env.VOA_DB_FILE || path.join(env.VOA_DATA_DIR || path.join(ROOT, 'data'), 'office.db'),
    ownerToken: env.OWNER_TOKEN || '',
    ownerName: env.OWNER_NAME || 'Proprietário',
    timezone: env.VOA_TIMEZONE || 'America/Sao_Paulo',
    // Expediente (hora local)
    workStart: env.VOA_WORK_START || '08:30',
    workEnd: env.VOA_WORK_END || '18:00',
    workDays: (env.VOA_WORK_DAYS || '1,2,3,4,5').split(',').map(Number),
    // Fila de execução
    workerEnabled: env.VOA_WORKER !== '0',
    workerIntervalMs: num(env.VOA_WORKER_INTERVAL_MS, 5000),
    maxConcurrentRuns: num(env.VOA_MAX_CONCURRENT, 2),
    workOutsideHours: env.VOA_WORK_OUTSIDE_HOURS === '1',
    schedulerEnabled: env.VOA_SCHEDULER !== '0',
    schedulerIntervalMs: num(env.VOA_SCHEDULER_INTERVAL_MS, 30000),
    lockMinutes: num(env.VOA_LOCK_MINUTES, 15),
    // Custos
    companyDailyBudgetUsd: num(env.VOA_DAILY_BUDGET_USD, 5),
    // Preços em US$ por milhão de tokens (podem ser ajustados por variável de ambiente)
    pricing: {
      'claude-opus-5-5': { input: num(env.PRICE_OPUS_IN, 4), output: num(env.PRICE_OPUS_OUT, 20) },
      'claude-sonnet-5-5': { input: num(env.PRICE_SONNET_IN, 2), output: num(env.PRICE_SONNET_OUT, 10) },
      'claude-haiku-5-5': { input: num(env.PRICE_HAIKU_IN, 0.1), output: num(env.PRICE_HAIKU_OUT, 0.5) },
    },
    webSearchPriceUsd: num(env.PRICE_WEB_SEARCH, 0.01),
    defaultModel: env.VOA_DEFAULT_MODEL || 'claude-opus-5-5',
    env,
  };
}
