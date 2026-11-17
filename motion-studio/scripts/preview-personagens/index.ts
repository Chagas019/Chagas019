// Entry de PREVIEW do agente PERSONAGENS (não faz parte do Root principal).
// Uso: node scripts/preview-personagens/render.mjs <Id> <frames> [gl]
import {registerRoot} from 'remotion';
import {RootPreview} from './Root';

registerRoot(RootPreview);
