import { useCurrentFrame } from 'remotion';
import { SCENE, type SceneId } from '../../timeline';

/**
 * Frame ABSOLUTO do filme dentro de uma cena (a <Sequence> entrega frame local).
 * Todas as cenas escrevem seus tempos em frames absolutos (src/cues.ts), então
 * a mesma cena funciona dentro do filme e isolada (composições "Cenas/…").
 */
export const useSceneFrame = (id: SceneId): number => useCurrentFrame() + SCENE[id].from;
