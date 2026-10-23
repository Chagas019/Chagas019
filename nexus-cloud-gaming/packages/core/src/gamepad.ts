/**
 * Mapeamento de botões sobre o layout "standard" da Gamepad API (W3C).
 * https://w3c.github.io/gamepad/#remapping
 *
 * O mapeamento é do cliente: ele traduz índices físicos em ações do jogo.
 * Na Fase 4, as ações são enviadas ao servidor por um canal de dados como
 * eventos de entrada validados — nunca como comandos arbitrários.
 */

export const ACTIONS = [
  'confirmar',
  'voltar',
  'acao3',
  'acao4',
  'ombroEsq',
  'ombroDir',
  'gatilhoEsq',
  'gatilhoDir',
  'selecionar',
  'iniciar',
  'analogicoEsq',
  'analogicoDir',
  'cima',
  'baixo',
  'esquerda',
  'direita',
  'menu',
] as const;

export type Action = (typeof ACTIONS)[number];
export type ButtonMapping = Record<Action, number>;

export const ACTION_LABEL: Record<Action, string> = {
  confirmar: 'Confirmar (A / ✕)',
  voltar: 'Voltar (B / ◯)',
  acao3: 'Ação 3 (X / ▢)',
  acao4: 'Ação 4 (Y / △)',
  ombroEsq: 'Ombro esquerdo (LB / L1)',
  ombroDir: 'Ombro direito (RB / R1)',
  gatilhoEsq: 'Gatilho esquerdo (LT / L2)',
  gatilhoDir: 'Gatilho direito (RT / R2)',
  selecionar: 'Selecionar (View / Share)',
  iniciar: 'Iniciar (Menu / Options)',
  analogicoEsq: 'Clique analógico esquerdo (L3)',
  analogicoDir: 'Clique analógico direito (R3)',
  cima: 'Direcional cima',
  baixo: 'Direcional baixo',
  esquerda: 'Direcional esquerda',
  direita: 'Direcional direita',
  menu: 'Botão central',
};

/** Índices do layout standard: a ação N começa no botão N. */
export const DEFAULT_MAPPING: ButtonMapping = Object.fromEntries(
  ACTIONS.map((a, i) => [a, i]),
) as ButtonMapping;

export const MAX_BUTTONS = 32;

/**
 * Atribui `button` a `action`. Se outro comando já usava esse botão, os dois
 * trocam de lugar — assim nenhum botão fica com duas ações nem uma ação fica
 * sem botão.
 */
export function remap(mapping: ButtonMapping, action: Action, button: number): ButtonMapping {
  if (!Number.isInteger(button) || button < 0 || button >= MAX_BUTTONS) {
    throw new RangeError(`Botão inválido: ${button}`);
  }
  const next = { ...mapping };
  const previous = next[action];
  const holder = ACTIONS.find((a) => a !== action && next[a] === button);
  if (holder) next[holder] = previous;
  next[action] = button;
  return next;
}

/** Ações ativas a partir do estado dos botões físicos. */
export function activeActions(pressed: readonly boolean[], mapping: ButtonMapping): Action[] {
  return ACTIONS.filter((a) => pressed[mapping[a]] === true);
}

/** Valida um mapeamento vindo do armazenamento local; se inválido, devolve o padrão. */
export function parseMapping(value: unknown): ButtonMapping {
  if (!value || typeof value !== 'object') return { ...DEFAULT_MAPPING };
  const raw = value as Record<string, unknown>;
  const result = {} as ButtonMapping;
  const used = new Set<number>();
  for (const a of ACTIONS) {
    const b = raw[a];
    if (typeof b !== 'number' || !Number.isInteger(b) || b < 0 || b >= MAX_BUTTONS || used.has(b)) {
      return { ...DEFAULT_MAPPING };
    }
    used.add(b);
    result[a] = b;
  }
  return result;
}

/** Zona morta radial para analógicos: elimina o "drift" e reescala o restante para 0..1. */
export function applyDeadzone(x: number, y: number, deadzone = 0.15): [number, number] {
  const mag = Math.hypot(x, y);
  if (mag < deadzone) return [0, 0];
  const scaled = Math.min(1, (mag - deadzone) / (1 - deadzone));
  return [(x / mag) * scaled, (y / mag) * scaled];
}
