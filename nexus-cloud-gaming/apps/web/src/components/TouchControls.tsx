'use client';

import { ACTION_LABEL, type Action } from '@nexus/core';
import { useRef } from 'react';

const DPAD: { action: Action; label: string; cls: string }[] = [
  { action: 'cima', label: '▲', cls: 'left-1/2 top-0 -translate-x-1/2' },
  { action: 'baixo', label: '▼', cls: 'left-1/2 bottom-0 -translate-x-1/2' },
  { action: 'esquerda', label: '◀', cls: 'left-0 top-1/2 -translate-y-1/2' },
  { action: 'direita', label: '▶', cls: 'right-0 top-1/2 -translate-y-1/2' },
];
const FACE: { action: Action; label: string; cls: string }[] = [
  { action: 'acao4', label: 'Y', cls: 'left-1/2 top-0 -translate-x-1/2' },
  { action: 'confirmar', label: 'A', cls: 'left-1/2 bottom-0 -translate-x-1/2' },
  { action: 'acao3', label: 'X', cls: 'left-0 top-1/2 -translate-y-1/2' },
  { action: 'voltar', label: 'B', cls: 'right-0 top-1/2 -translate-y-1/2' },
];

/**
 * Controle virtual de toque. Usa Pointer Events com captura, então vários
 * dedos funcionam ao mesmo tempo e soltar fora do botão também libera.
 */
export function TouchControls({ onChange, vibrate }: { onChange: (action: Action, down: boolean) => void; vibrate: boolean }) {
  const held = useRef(new Map<number, Action>());

  const press = (action: Action) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    held.current.set(e.pointerId, action);
    if (vibrate && 'vibrate' in navigator) navigator.vibrate(12);
    onChange(action, true);
  };
  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    const action = held.current.get(e.pointerId);
    if (!action) return;
    held.current.delete(e.pointerId);
    onChange(action, false);
  };

  const btn = (b: { action: Action; label: string; cls: string }, round: boolean) => (
    <button
      key={b.action}
      type="button"
      aria-label={ACTION_LABEL[b.action]}
      onPointerDown={press(b.action)}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
      className={`absolute grid h-12 w-12 sm:h-14 sm:w-14 touch-none select-none place-items-center border border-white/25 bg-white/10 font-display text-lg font-bold text-white/90 backdrop-blur-sm active:bg-cyan/40 ${round ? 'rounded-full' : 'rounded-xl'} ${b.cls}`}
    >
      {b.label}
    </button>
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" data-testid="touch-controls">
      <div className="pointer-events-auto relative h-36 w-36 sm:h-44 sm:w-44">{DPAD.map((b) => btn(b, false))}</div>
      <div className="pointer-events-auto mb-2 flex gap-3 self-end">
        <button
          type="button"
          onPointerDown={press('iniciar')}
          onPointerUp={release}
          onPointerCancel={release}
          className="h-9 touch-none select-none rounded-full border border-white/25 bg-white/10 px-4 text-xs font-semibold text-white/90"
        >
          Start
        </button>
      </div>
      <div className="pointer-events-auto relative h-36 w-36 sm:h-44 sm:w-44">{FACE.map((b) => btn(b, true))}</div>
    </div>
  );
}
