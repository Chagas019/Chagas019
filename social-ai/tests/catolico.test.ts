import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestEnv, useLLM } from './helpers.js';
import { getDb } from '../src/db/db.js';
import { applyPreset, getBrand, getSettings } from '../src/db/repo.js';
import { allocateCalendar } from '../src/agents/calendar.js';
import { fetchLiturgy, getStoredLiturgy, liturgyContext } from '../src/integrations/liturgy.js';
import { loadEnv, resetEnvCache } from '../src/config/env.js';
import { brandContrastIssues } from '../src/quality/visual.js';

const lit = {
  date_confirmed: true, celebration: '[FICTÍCIO] Quinta-feira da 33ª semana do Tempo Comum', liturgical_season: 'Tempo Comum', liturgical_color: 'verde',
  first_reading: '1Mc 2,15-29', psalm: 'Sl 49(50)', psalm_refrain: 'A todo homem que procede retamente, eu mostrarei a salvação que vem de Deus.',
  second_reading: null, gospel: 'Lc 19,41-44', saint_of_day: '[FICTÍCIO] Santo exemplo', confidence: 'alta',
};

describe('perfil católico (@chagas_catolico)', () => {
  beforeAll(() => {
    setupTestEnv({ SOCIAL_AI_PRESET: 'catolico' });
  });

  it('aplica o perfil no primeiro start (marca, pilares, horários, liturgia)', () => {
    const b = getBrand();
    expect(b.handle).toBe('chagas_catolico');
    expect(b.niche).toMatch(/católico/i);
    expect(b.rules.join(' ')).toMatch(/Nunca inventar versículos/);
    const s = getSettings();
    expect(s.liturgy.enabled).toBe(true);
    expect(s.pillars.map((p) => p.key)).toContain('liturgia_dia');
    expect(s.publish_times.feed).toBe('07:30');
    expect(brandContrastIssues(b.colors)).toHaveLength(0);
  });

  it('calendário: stories diários com Evangelho do dia e pilares sem repetir em dias consecutivos', () => {
    const s = getSettings();
    const plan = allocateCalendar({ startDate: '2026-12-01', days: 30, pillars: s.pillars, reelsPerDay: 1, feedPerDay: 1, times: s.publish_times, storyPillars: s.story_pillars });
    expect(plan.filter((p) => p.slot === 'stories').every((p) => p.pillar === 'liturgia_dia')).toBe(true);
    for (const slot of ['reel', 'feed']) {
      const seq = plan.filter((p) => p.slot === slot);
      for (let i = 1; i < seq.length; i++) expect(seq[i].pillar).not.toBe(seq[i - 1].pillar);
      for (const p of seq) expect(s.pillars.find((x) => x.key === p.pillar)!.formats).toContain(p.format);
    }
  });

  it('liturgia: busca restrita a fontes oficiais, guarda só referências e reutiliza o cache', async () => {
    const llm = useLLM([() => lit]);
    const l = await fetchLiturgy('2026-11-19');
    expect(l?.gospel).toBe('Lc 19,41-44');
    expect(llm.calls[0].webSearch).toBe(true);
    expect(llm.calls[0].prompt).toMatch(/Não transcreva os textos das leituras/);
    expect(getStoredLiturgy('2026-11-19')?.psalm_refrain).toMatch(/salvação/);
    // segunda chamada usa o banco (sem LLM)
    useLLM([]);
    expect((await fetchLiturgy('2026-11-19'))?.first_reading).toBe('1Mc 2,15-29');
    expect(liturgyContext(l)).toMatch(/Evangelho: Lc 19,41-44/);
  });

  it('liturgia não confirmada pela fonte não é usada (nada inventado)', async () => {
    useLLM([() => ({ ...lit, date_confirmed: false })]);
    expect(await fetchLiturgy('2026-11-20')).toBeNull();
    expect(getDb().get(`SELECT 1 FROM liturgy_days WHERE date='2026-11-20'`)).toBeUndefined();
  });

  it('perfis podem ser trocados pelo painel sem ligar produção', async () => {
    await applyPreset('fotografia_mobile');
    expect(getSettings().liturgy.enabled).toBe(false);
    expect(getSettings().production_mode).toBe(false);
    await applyPreset('catolico');
    expect(getBrand().handle).toBe('chagas_catolico');
  });

  it('PUBLIC_BASE_URL e META_REDIRECT_URI vêm do Render automaticamente', () => {
    process.env.RENDER_EXTERNAL_URL = 'https://chagas-social-ai.onrender.com';
    process.env.PUBLIC_BASE_URL = '';
    delete process.env.META_REDIRECT_URI;
    resetEnvCache();
    const e = loadEnv();
    expect(e.PUBLIC_BASE_URL).toBe('https://chagas-social-ai.onrender.com');
    expect(e.META_REDIRECT_URI).toBe('https://chagas-social-ai.onrender.com/api/instagram/oauth/callback');
    delete process.env.RENDER_EXTERNAL_URL;
  });
});
