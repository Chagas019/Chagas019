import { createNeonBreaker } from './neonBreaker';
import { createNeonSnake } from './neonSnake';
import { createStarfall } from './starfall';
import type { GameFactory } from './types';
import { createVoidRunner } from './voidRunner';

/** Jogos do navegador por slug do catálogo. Um slug sem entrada aqui não tem player. */
export const BROWSER_GAME_FACTORIES: Record<string, GameFactory> = {
  'neon-breaker': createNeonBreaker,
  'void-runner': createVoidRunner,
  starfall: createStarfall,
  'neon-snake': createNeonSnake,
};
