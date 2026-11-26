import type React from 'react';
import type { SceneIdV2 } from '../timeline-v2';
import type { SceneV2Props } from './shared';
import { V1EAi } from './V1EAi';
import { V2Preparados } from './V2Preparados';
import { V3DezGincana } from './V3DezGincana';
import { V4Chegando } from './V4Chegando';
import { V5Selo } from './V5Selo';

export { V1EAi, V2Preparados, V3DezGincana, V4Chegando, V5Selo };
export type { SceneV2Props } from './shared';

/** Cena V2 por id (ordem do storyboard V2). */
export const SCENE_V2_COMPONENTS: Record<SceneIdV2, React.FC<SceneV2Props>> = {
  V1: V1EAi,
  V2: V2Preparados,
  V3: V3DezGincana,
  V4: V4Chegando,
  V5: V5Selo,
};

/** Ids das composições isoladas (pasta "CenasV2" no Studio). */
export const SCENE_V2_COMPOSITION_IDS: Record<SceneIdV2, string> = {
  V1: 'V1-EAi',
  V2: 'V2-Preparados',
  V3: 'V3-DezGincana',
  V4: 'V4-Chegando',
  V5: 'V5-Selo',
};
