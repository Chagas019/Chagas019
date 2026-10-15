import { describe, expect, it } from 'vitest';
import { NEUTRAL, clampValue, combine, isNeutral } from './adjustments';
import { HISTORY_LIMIT, INITIAL_EDIT, createHistory, historyReducer, type EditState } from './history';
import { PRESETS, validatePreset } from '../presets/presets';

const withExposure = (v: number): EditState => ({ ...INITIAL_EDIT, manual: { ...NEUTRAL, exposure: v } });

describe('ajustes', () => {
  it('limita valores ao intervalo e normaliza matizes', () => {
    expect(clampValue('contrast', 500)).toBe(100);
    expect(clampValue('exposure', -9)).toBe(-3);
    expect(clampValue('splitShadowHue', 370)).toBe(10);
    expect(clampValue('contrast', Number.NaN)).toBe(0);
  });

  it('combina preset escalado com ajustes manuais', () => {
    const out = combine({ contrast: 40, splitShadowHue: 200 }, 0.5, { ...NEUTRAL, contrast: 10 });
    expect(out.contrast).toBe(30);
    expect(out.splitShadowHue).toBe(200);
    expect(isNeutral(combine({ contrast: 40 }, 0, NEUTRAL))).toBe(true);
  });
});

describe('presets', () => {
  it('todos os presets são válidos e têm ids únicos', () => {
    for (const p of PRESETS) expect(validatePreset(p)).toEqual([]);
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length);
  });

  it('inclui os sete presets autorais', () => {
    expect(PRESETS.map((p) => p.name)).toEqual([
      'Emaús', 'La Crème', 'Cinema', 'Luz Sagrada', 'Retrato', 'Moody', 'Editorial',
    ]);
  });

  it('detecta parâmetros fora do intervalo', () => {
    const bad = { ...PRESETS[0]!, adjustments: { contrast: 300 } };
    expect(validatePreset(bad)).toHaveLength(1);
  });
});

describe('desfazer e refazer', () => {
  it('desfaz e refaz passos', () => {
    let h = createHistory();
    h = historyReducer(h, { type: 'set', state: withExposure(1), key: 'a', at: 0 });
    h = historyReducer(h, { type: 'set', state: withExposure(2), key: 'b', at: 10 });
    h = historyReducer(h, { type: 'undo' });
    expect(h.present.manual.exposure).toBe(1);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toEqual(INITIAL_EDIT);
    h = historyReducer(h, { type: 'redo' });
    expect(h.present.manual.exposure).toBe(1);
  });

  it('junta arrastos do mesmo controle em um passo só', () => {
    let h = createHistory();
    for (let i = 1; i <= 10; i++) {
      h = historyReducer(h, { type: 'set', state: withExposure(i / 10), key: 'exposure', at: i * 50 });
    }
    expect(h.past).toHaveLength(1);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present).toEqual(INITIAL_EDIT);
  });

  it('nova alteração descarta o refazer e restaurar também pode ser desfeito', () => {
    let h = createHistory();
    h = historyReducer(h, { type: 'set', state: withExposure(1), key: 'a', at: 0 });
    h = historyReducer(h, { type: 'reset', at: 5000 });
    expect(h.present).toEqual(INITIAL_EDIT);
    h = historyReducer(h, { type: 'undo' });
    expect(h.present.manual.exposure).toBe(1);
    h = historyReducer(h, { type: 'set', state: withExposure(3), key: 'c', at: 9000 });
    expect(h.future).toHaveLength(0);
  });

  it('limita o tamanho do histórico', () => {
    let h = createHistory();
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) {
      h = historyReducer(h, { type: 'set', state: withExposure((i % 50) / 20 + 0.01 * i), key: `k${i}`, at: i });
    }
    expect(h.past.length).toBe(HISTORY_LIMIT);
  });
});
