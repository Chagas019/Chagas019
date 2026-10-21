import { useSkyline } from '../state/store';
import { presetShot } from '../three/camera/views';

export interface TourStep {
  id: string;
  title: string;
  caption: string;
  duration: number;
  /** Ações disparadas em instantes (segundos) dentro da etapa. */
  actions: { at: number; run: () => void }[];
}

const S = () => useSkyline.getState();

/** Roteiro da "Apresentação guiada": nove etapas com textos curtos sincronizados. */
export const TOUR: TourStep[] = [
  {
    id: 'panorama',
    title: 'Vista panorâmica',
    caption: 'Quarenta pavimentos entre o mar e a cidade. Bem-vindo ao SKYLINE 40.',
    duration: 7,
    actions: [{ at: 0, run: () => { S().resetCamera(); S().flyTo({ position: [330, 150, 520], target: [0, 70, 0] }, 5.5); } }],
  },
  {
    id: 'fachada',
    title: 'Fachada',
    caption: 'Pele de vidro, lajes aparentes em branco mineral e brises de alumínio grafite.',
    duration: 7,
    actions: [{ at: 0, run: () => S().flyTo({ position: [38, 46, 96], target: [0, 58, 0] }, 5) }],
  },
  {
    id: 'giro',
    title: 'Giro de 360°',
    caption: 'Todas as fachadas, com varandas que se abrem para o horizonte.',
    duration: 15,
    actions: [
      { at: 0, run: () => S().flyTo({ position: [150, 95, 170], target: [0, 66, 0] }, 2.5) },
      { at: 2.6, run: () => S().setOrbitSpeed((Math.PI * 2) / 12) },
      { at: 14.7, run: () => S().setOrbitSpeed(0) },
    ],
  },
  {
    id: 'pavimentos',
    title: 'Pavimentos',
    caption: 'Cada andar pode ser isolado: o corte revela a planta com quatro unidades e o núcleo central.',
    duration: 9,
    actions: [
      { at: 0, run: () => S().selectFloor(18) },
      { at: 4.5, run: () => S().selectFloor(34) },
    ],
  },
  {
    id: 'explodida',
    title: 'Vista explodida',
    caption: 'Os 40 pavimentos se separam e mostram a organização vertical: acesso, residências e cobertura.',
    duration: 10,
    actions: [
      { at: 0, run: () => { S().selectFloor(null, { fly: false }); S().toggleExploded(true); } },
    ],
  },
  {
    id: 'apartamento',
    title: 'Apartamento decorado',
    caption: 'Living integrado à varanda gourmet, cozinha com ilha e duas suítes — unidade demonstrativa.',
    duration: 13,
    actions: [
      { at: 0, run: () => { S().toggleExploded(false); S().openApartment(); } },
      { at: 5, run: () => S().setApartmentView('interior', 'living') },
      { at: 9.5, run: () => S().setApartmentView('interior', 'varanda') },
    ],
  },
  {
    id: 'cobertura',
    title: 'Cobertura',
    caption: 'Piscina panorâmica com borda infinita, deck, lounge e espaço gourmet a mais de 135 metros.',
    duration: 13,
    actions: [
      { at: 0, run: () => { S().setTimeOfDay('sunset'); S().openRooftop('overview'); } },
      { at: 4.5, run: () => S().openRooftop('pool') },
      { at: 9, run: () => S().openRooftop('lounge') },
    ],
  },
  {
    id: 'garagem',
    title: 'Garagem',
    caption: 'Dois subsolos com vagas demarcadas, rampas, sinalização e acesso direto aos elevadores.',
    duration: 11,
    actions: [
      { at: 0, run: () => { S().setTimeOfDay('day'); S().openGarage(0, 'perspective'); } },
      { at: 5.5, run: () => S().openGarage(0, 'street') },
    ],
  },
  {
    id: 'retorno',
    title: 'Visão geral',
    caption: 'SKYLINE 40. Uma nova perspectiva de viver.',
    duration: 7,
    actions: [{ at: 0, run: () => { S().resetCamera(); S().flyTo(presetShot('overview'), 3.2); } }],
  },
];

export const TOUR_TOTAL = TOUR.reduce((s, t) => s + t.duration, 0);
