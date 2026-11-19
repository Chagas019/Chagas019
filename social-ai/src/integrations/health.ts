import { env } from '../config/env.js';
import { getActiveAccount, setIntegrationStatus } from '../db/repo.js';
import { getDb, json } from '../db/db.js';
import { ffmpegVersion } from './media/ffmpeg.js';
import { getImageGen } from './imagegen/provider.js';
import { verifyAccount } from './instagram/account.js';

/** Verifica cada integração de verdade (sem simular "conectado"). */
export async function checkIntegrations() {
  const e = env();
  try {
    setIntegrationStatus('ffmpeg', 'ok', { version: await ffmpegVersion() });
  } catch (err: any) {
    setIntegrationStatus('ffmpeg', 'error', {}, err.message);
  }

  setIntegrationStatus('anthropic', e.ANTHROPIC_API_KEY ? 'ok' : 'not_configured', { model: e.ANTHROPIC_MODEL, effort: e.ANTHROPIC_EFFORT, note: e.ANTHROPIC_API_KEY ? 'Chave presente; validada na primeira chamada' : 'Defina ANTHROPIC_API_KEY' });

  const gen = getImageGen();
  setIntegrationStatus('image_gen', gen ? 'ok' : 'not_configured', { provider: gen?.name ?? 'none', note: gen ? '' : 'Opcional — artes usam composição tipográfica da marca' });

  if (/^https:\/\//.test(e.PUBLIC_BASE_URL)) {
    try {
      const r = await fetch(`${e.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/health`);
      setIntegrationStatus('public_media', r.ok ? 'ok' : 'error', { url: e.PUBLIC_BASE_URL, status: r.status }, r.ok ? null : `HTTP ${r.status}`);
    } catch (err: any) {
      setIntegrationStatus('public_media', 'error', { url: e.PUBLIC_BASE_URL }, err.message);
    }
  } else setIntegrationStatus('public_media', 'not_configured', {}, 'PUBLIC_BASE_URL deve ser HTTPS');

  if (getActiveAccount()) {
    try {
      await verifyAccount();
    } catch (err: any) {
      setIntegrationStatus('instagram', 'error', {}, err.message);
    }
  } else setIntegrationStatus('instagram', 'not_configured', {}, null);

  return getDb().all('SELECT * FROM integrations').map((r) => ({ ...r, details: json.parse(r.details, {}) }));
}
