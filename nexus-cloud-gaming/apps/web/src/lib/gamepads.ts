'use client';

import { useEffect, useState } from 'react';

export interface PadSnapshot {
  index: number;
  id: string;
  /** "standard" quando o navegador reconhece o layout padrão; caso contrário, índices variam por controle. */
  mapping: string;
  buttons: { pressed: boolean; value: number }[];
  axes: number[];
  canVibrate: boolean;
}

function snapshot(): PadSnapshot[] {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return [];
  return Array.from(navigator.getGamepads())
    .filter((g): g is Gamepad => g !== null && g.connected)
    .map((g) => ({
      index: g.index,
      id: g.id,
      mapping: g.mapping,
      buttons: g.buttons.map((b) => ({ pressed: b.pressed, value: b.value })),
      axes: [...g.axes],
      canVibrate: Boolean((g as Gamepad & { vibrationActuator?: unknown }).vibrationActuator),
    }));
}

function sameState(a: PadSnapshot[], b: PadSnapshot[]) {
  if (a.length !== b.length) return false;
  return a.every((p, i) => {
    const q = b[i];
    return p.id === q.id && p.buttons.every((x, j) => x.pressed === q.buttons[j]?.pressed && Math.abs(x.value - q.buttons[j].value) < 0.02)
      && p.axes.every((x, j) => Math.abs(x - q.axes[j]) < 0.02);
  });
}

export const gamepadSupported = () => typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function';

/**
 * Lê os controles conectados a cada quadro (a Gamepad API não emite eventos
 * por botão). Só re-renderiza quando algo mudou. Navegadores só expõem um
 * controle depois que o usuário aperta um botão dele nesta página.
 */
export function useGamepads(active = true): PadSnapshot[] {
  const [pads, setPads] = useState<PadSnapshot[]>([]);

  useEffect(() => {
    if (!active || !gamepadSupported()) return;
    let raf = 0;
    let last: PadSnapshot[] = [];
    const loop = () => {
      const now = snapshot();
      if (!sameState(now, last)) {
        last = now;
        setPads(now);
      }
      raf = requestAnimationFrame(loop);
    };
    const refresh = () => {
      last = snapshot();
      setPads(last);
    };
    window.addEventListener('gamepadconnected', refresh);
    window.addEventListener('gamepaddisconnected', refresh);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('gamepadconnected', refresh);
      window.removeEventListener('gamepaddisconnected', refresh);
    };
  }, [active]);

  return pads;
}

export async function vibrate(index: number) {
  const g = navigator.getGamepads?.()[index] as (Gamepad & { vibrationActuator?: { playEffect: (t: string, p: object) => Promise<unknown> } }) | null;
  try {
    await g?.vibrationActuator?.playEffect('dual-rumble', { duration: 300, strongMagnitude: 0.8, weakMagnitude: 0.4 });
    return true;
  } catch {
    return false;
  }
}
