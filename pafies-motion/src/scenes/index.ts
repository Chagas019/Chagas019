import type React from 'react';
import type { SceneId } from '../timeline';
import type { SceneProps } from '../layout';
import { S01Faisca } from './S01Faisca';
import { S02Gotas } from './S02Gotas';
import { S03Energia } from './S03Energia';
import { S04Anel } from './S04Anel';
import { S05Dez } from './S05Dez';
import { S06Encontro } from './S06Encontro';

export { S01Faisca, S02Gotas, S03Energia, S04Anel, S05Dez, S06Encontro };

/** Cena por id (ordem do storyboard). */
export const SCENE_COMPONENTS: Record<SceneId, React.FC<SceneProps>> = {
  S01: S01Faisca,
  S02: S02Gotas,
  S03: S03Energia,
  S04: S04Anel,
  S05: S05Dez,
  S06: S06Encontro,
};

/** Ids das composições isoladas (pasta "Cenas" no Studio). */
export const SCENE_COMPOSITION_IDS: Record<SceneId, string> = {
  S01: 'S01-Faisca',
  S02: 'S02-Gotas',
  S03: 'S03-Energia',
  S04: 'S04-Anel',
  S05: 'S05-Dez',
  S06: 'S06-Encontro',
};
