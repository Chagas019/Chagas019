/** Lista de imagens/modelos gerados pela ferramenta de render. Coordenadas no espaço do modelo (metros). */
import type { BuildOptions } from '@/three/buildFromPlan';

export interface Job {
  file: string;
  kind?: 'foto' | 'panorama' | 'glb' | 'lote' | 'planta';
  plan: 'horizonte' | 'mirante' | 'jardim' | 'patio' | 'eixo' | 'studio';
  build?: BuildOptions;
  mood: 'dia' | 'dourado' | 'crepusculo' | 'interior';
  camera: { position: [number, number, number]; target: [number, number, number] };
  fov?: number;
  size: [number, number];
  thumb?: number;
  supersample?: number;
  fog?: number;
  hide?: string[];
  /** desloca o enquadramento verticalmente (fração da altura) mantendo verticais retas */
  shift?: number;
  /** eleva o modelo e desenha uma cidade abaixo (apartamentos) */
  city?: boolean;
  pavement?: boolean;
}

const PHOTO: [number, number] = [1600, 1067];
const HORIZONTE: BuildOptions = { facade: 'concreto', accentLevel: 'superior' };

export const jobs: Job[] = [
  // Casa Horizonte — imóvel principal (tem .glb e panoramas)
  { file: 'horizonte/fachada-crepusculo', plan: 'horizonte', build: HORIZONTE, mood: 'crepusculo', camera: { position: [17, 2.2, 17], target: [-1, 2.8, -4] }, fov: 42, size: [2400, 1500], thumb: 1200, fog: 60 },
  { file: 'horizonte/fachada-rua', plan: 'horizonte', build: HORIZONTE, mood: 'dia', camera: { position: [-24, 4.5, -25], target: [-2, 2.6, -5] }, fov: 40, size: PHOTO, thumb: 800, fog: 70 },
  { file: 'horizonte/piscina', plan: 'horizonte', build: HORIZONTE, mood: 'dourado', camera: { position: [-6, 1.5, 11], target: [8, 1.6, 0] }, fov: 46, size: PHOTO, thumb: 800, fog: 60 },
  { file: 'horizonte/sala', plan: 'horizonte', build: HORIZONTE, mood: 'interior', camera: { position: [-4.2, 1.5, 0.2], target: [6, 1.25, -6] }, fov: 62, size: PHOTO, thumb: 800, fog: 80 },
  { file: 'horizonte/cozinha', plan: 'horizonte', build: HORIZONTE, mood: 'interior', camera: { position: [2.8, 1.6, -2.2], target: [-2.5, 1.0, -7] }, fov: 60, size: PHOTO, thumb: 800, fog: 80 },
  { file: 'horizonte/suite', plan: 'horizonte', build: HORIZONTE, mood: 'interior', camera: { position: [1.6, 4.85, -10.4], target: [8, 4.2, -4.5] }, fov: 62, size: PHOTO, thumb: 800, fog: 80 },
  { file: 'horizonte/gourmet', plan: 'horizonte', build: HORIZONTE, mood: 'dourado', camera: { position: [5.5, 1.7, 7.5], target: [11, 1.5, -2.5] }, fov: 52, size: PHOTO, thumb: 800, fog: 60 },
  { file: 'horizonte/aerea', plan: 'horizonte', build: HORIZONTE, mood: 'dia', camera: { position: [26, 22, 26], target: [0, 0, 0] }, fov: 36, size: PHOTO, thumb: 800, fog: 90 },
  { file: 'horizonte/pano-sala', kind: 'panorama', plan: 'horizonte', build: HORIZONTE, mood: 'interior', camera: { position: [5.5, 1.62, -7.2], target: [0, 0, 0] }, size: [4096, 2048] },
  { file: 'horizonte/pano-cozinha', kind: 'panorama', plan: 'horizonte', build: HORIZONTE, mood: 'interior', camera: { position: [-2, 1.72, -6.2], target: [0, 0, 0] }, size: [4096, 2048] },
  { file: 'horizonte/pano-gourmet', kind: 'panorama', plan: 'horizonte', build: HORIZONTE, mood: 'dourado', camera: { position: [10, 1.72, -2.5], target: [0, 0, 0] }, size: [4096, 2048] },
  { file: 'horizonte/pano-suite', kind: 'panorama', plan: 'horizonte', build: HORIZONTE, mood: 'interior', camera: { position: [5, 4.92, -7.5], target: [0, 0, 0] }, size: [4096, 2048] },
  { file: 'models/casa-horizonte', kind: 'glb', plan: 'horizonte', build: { ...HORIZONTE, backdrop: 30 }, mood: 'dia', camera: { position: [0, 0, 0], target: [0, 0, 0] }, size: [1, 1] },

  // Apartamento Mirante (tem .glb, sem panoramas)
  { file: 'mirante/sala', plan: 'mirante', build: { facade: 'branco', site: false }, city: true, mood: 'dourado', camera: { position: [0.4, 1.55, 0.9], target: [-7, 1.2, -4] }, fov: 62, size: PHOTO, thumb: 800, fog: 120 },
  { file: 'mirante/cozinha', plan: 'mirante', build: { facade: 'branco', site: false }, city: true, mood: 'interior', camera: { position: [-3, 1.6, 0.8], target: [6, 1.05, -2.6] }, fov: 60, size: PHOTO, thumb: 800, fog: 120 },
  { file: 'mirante/varanda', plan: 'mirante', build: { facade: 'branco', site: false }, city: true, mood: 'dourado', camera: { position: [4, 1.6, -3.2], target: [-6, 0.6, -9] }, fov: 60, size: PHOTO, thumb: 800, fog: 160 },
  { file: 'mirante/suite', plan: 'mirante', build: { facade: 'branco', site: false }, city: true, mood: 'interior', camera: { position: [-4.5, 1.6, 6.3], target: [-8, 1.0, 2] }, fov: 62, size: PHOTO, thumb: 800, fog: 120 },
  { file: 'models/apartamento-mirante', kind: 'glb', plan: 'mirante', build: { facade: 'branco', site: false }, mood: 'dia', camera: { position: [0, 0, 0], target: [0, 0, 0] }, size: [1, 1] },

  // Casa Jardim das Águas (sem 3D)
  { file: 'jardim/fachada', plan: 'jardim', build: { facade: 'branco' }, mood: 'dia', camera: { position: [-8, 2.3, 21], target: [1, 1.8, -2] }, fov: 44, size: PHOTO, thumb: 800, fog: 60 },
  { file: 'jardim/sala', plan: 'jardim', build: { facade: 'branco' }, mood: 'interior', camera: { position: [-4.6, 1.55, -2.4], target: [-11, 1.1, -7.5] }, fov: 62, size: PHOTO, thumb: 800, fog: 80 },

  // Casa Pátio
  { file: 'patio/aerea', plan: 'patio', build: { facade: 'grafite' }, mood: 'dourado', camera: { position: [16, 11, 21], target: [0, 0, 1] }, fov: 40, size: PHOTO, thumb: 800, fog: 70 },
  { file: 'patio/patio', plan: 'patio', build: { facade: 'grafite' }, mood: 'dia', camera: { position: [3, 1.6, 8.6], target: [-1.5, 1.4, -3] }, fov: 60, size: PHOTO, thumb: 800, fog: 70 },

  // Espaço Eixo (comercial)
  { file: 'eixo/vitrine', plan: 'eixo', build: { facade: 'grafite', ground: 'nenhum', backdrop: 0 }, pavement: true, mood: 'dourado', camera: { position: [-6, 1.7, -18], target: [1.5, 2.4, -4] }, fov: 44, size: PHOTO, thumb: 800, fog: 80 },
  { file: 'eixo/salao', plan: 'eixo', build: { facade: 'grafite', ground: 'nenhum', backdrop: 0 }, pavement: true, mood: 'interior', camera: { position: [2.4, 1.7, 6.4], target: [-5, 1.6, -6] }, fov: 62, size: PHOTO, thumb: 800, fog: 80 },

  // Studio Linha
  { file: 'studio/estar', plan: 'studio', build: { facade: 'branco', site: false }, city: true, mood: 'interior', camera: { position: [3.0, 1.6, 0.7], target: [-3, 1.1, -2.6] }, fov: 66, size: PHOTO, thumb: 800, fog: 120 },
  { file: 'studio/planta', kind: 'planta', plan: 'studio', build: { facade: 'branco', site: false, roof: false }, mood: 'interior', camera: { position: [0, 30, 0], target: [0, 0, 0] }, size: [1600, 1400] },

  // Terreno
  { file: 'terreno/lote', kind: 'lote', plan: 'horizonte', mood: 'dourado', camera: { position: [-18, 6, 30], target: [0, 0, -4] }, fov: 44, size: PHOTO, thumb: 800, fog: 60 },
];

// verificação de orientação dos panoramas (não publicado)
export const debugJobs: Job[] = [
  { file: 'debug/sala-norte', plan: 'horizonte', build: { facade: 'concreto', accentLevel: 'superior' }, mood: 'interior', camera: { position: [5.5, 1.62, -7.2], target: [5.5, 1.62, -20] }, fov: 75, size: [800, 450], supersample: 1 },
  { file: 'debug/sala-leste', plan: 'horizonte', build: { facade: 'concreto', accentLevel: 'superior' }, mood: 'interior', camera: { position: [5.5, 1.62, -7.2], target: [20, 1.62, -7.2] }, fov: 75, size: [800, 450], supersample: 1 },
];
