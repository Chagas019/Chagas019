'use client';

import { ACTIONS, ACTION_LABEL, DEFAULT_MAPPING, activeActions, applyDeadzone, remap, type Action } from '@nexus/core';
import { Bluetooth, Gamepad2, RotateCcw, TriangleAlert, Vibrate } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { gamepadSupported, useGamepads, vibrate, type PadSnapshot } from '@/lib/gamepads';
import { usePreferences } from '@/lib/storage';
import { EmptyState } from './Section';

function Stick({ x, y, label }: { x: number; y: number; label: string }) {
  const [dx, dy] = applyDeadzone(x, y);
  return (
    <figure className="flex flex-col items-center gap-2">
      <div className="relative h-28 w-28 rounded-full border border-line-strong bg-void/60">
        <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 bg-line" />
        <div className="absolute left-1/2 top-1/2 h-full w-px -translate-y-1/2 bg-line" />
        <div
          className="absolute left-1/2 top-1/2 h-8 w-8 rounded-full bg-gradient-to-br from-blue to-violet shadow-[0_0_16px_rgb(124_92_255/0.8)]"
          style={{ transform: `translate(calc(-50% + ${x * 40}px), calc(-50% + ${y * 40}px))` }}
        />
      </div>
      <figcaption className="text-center text-xs text-muted">
        {label}
        <span className="block font-mono text-faint">{dx.toFixed(2)}, {dy.toFixed(2)}</span>
      </figcaption>
    </figure>
  );
}

/**
 * Teste e mapeamento de controles pela Gamepad API (dados reais do aparelho).
 * O mapeamento é salvo nas preferências locais e validado ao ler.
 */
export function GamepadTester() {
  const pads = useGamepads();
  const [prefs, update] = usePreferences();
  const [selected, setSelected] = useState(0);
  const [listening, setListening] = useState<Action | null>(null);
  const [message, setMessage] = useState('');
  const [supported, setSupported] = useState<boolean | null>(null);
  const previous = useRef<boolean[]>([]);

  useEffect(() => setSupported(gamepadSupported()), []);

  const pad: PadSnapshot | undefined = pads.find((p) => p.index === selected) ?? pads[0];
  const pressed = pad?.buttons.map((b) => b.pressed) ?? [];
  const actions = pad ? activeActions(pressed, prefs.mapping) : [];

  // Em modo de escuta, o primeiro botão que passar de solto para apertado vira o novo botão da ação.
  useEffect(() => {
    if (!listening || !pad) {
      previous.current = pressed;
      return;
    }
    const idx = pressed.findIndex((p, i) => p && !previous.current[i]);
    previous.current = pressed;
    if (idx >= 0) {
      update({ mapping: remap(prefs.mapping, listening, idx) });
      setMessage(`${ACTION_LABEL[listening]} agora usa o botão ${idx}.`);
      setListening(null);
    }
  });

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setListening(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listening]);

  if (supported === false) {
    return (
      <EmptyState icon={<TriangleAlert className="h-6 w-6" aria-hidden="true" />} title="Este navegador não oferece a Gamepad API">
        Use uma versão recente do Chrome, Edge, Firefox ou Safari. Os controles de toque continuam disponíveis.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="panel p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Gamepad2 className="h-5 w-5 text-cyan" aria-hidden="true" /> Estado ao vivo</h2>
          {pads.length > 1 && (
            <label className="text-sm text-muted">
              Controle{' '}
              <select className="field inline-block w-auto min-h-10" value={pad?.index} onChange={(e) => setSelected(Number(e.target.value))}>
                {pads.map((p) => <option key={p.index} value={p.index}>#{p.index + 1} {p.id.slice(0, 30)}</option>)}
              </select>
            </label>
          )}
        </div>

        {!pad ? (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong p-8 text-center" role="status">
            <Bluetooth className="mx-auto h-10 w-10 animate-pulse text-cyan" aria-hidden="true" />
            <p className="mt-4 font-semibold">Aguardando controle…</p>
            <ol className="mx-auto mt-3 max-w-sm list-decimal space-y-1 pl-5 text-left text-sm text-muted">
              <li>Coloque o controle em modo de pareamento.</li>
              <li>Pareie nas configurações de Bluetooth do aparelho.</li>
              <li>Volte aqui e <strong className="text-ink">aperte qualquer botão</strong> — o navegador só mostra o controle depois disso.</li>
            </ol>
          </div>
        ) : (
          <>
            <p className="mt-2 break-all text-sm text-muted" data-testid="pad-id">{pad.id}</p>
            {pad.mapping !== 'standard' && (
              <p className="mt-3 flex gap-2 rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
                <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                O navegador não reconheceu o layout padrão deste controle. Os botões podem estar trocados: use o mapeamento ao lado.
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-around gap-6">
              <Stick x={pad.axes[0] ?? 0} y={pad.axes[1] ?? 0} label="Analógico esquerdo" />
              <Stick x={pad.axes[2] ?? 0} y={pad.axes[3] ?? 0} label="Analógico direito" />
            </div>
            <ul className="mt-6 grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label="Botões físicos">
              {pad.buttons.map((b, i) => (
                <li
                  key={i}
                  className={`relative overflow-hidden rounded-xl border px-2 py-2.5 text-center font-mono text-sm transition ${b.pressed ? 'border-cyan bg-cyan/15 text-ink shadow-[0_0_14px_rgb(56_214_245/0.5)]' : 'border-line text-faint'}`}
                >
                  <span className="absolute inset-x-0 bottom-0 bg-cyan/30" style={{ height: `${b.value * 100}%` }} aria-hidden="true" />
                  <span className="relative">{i}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-sm" aria-live="polite">
              <span className="text-faint">Ações ativas: </span>
              {actions.length ? actions.map((a) => ACTION_LABEL[a]).join(', ') : <span className="text-faint">nenhuma</span>}
            </p>
            {pad.canVibrate && (
              <button
                type="button"
                className="btn btn-ghost mt-5"
                onClick={async () => setMessage((await vibrate(pad.index)) ? 'Vibração enviada.' : 'O controle não aceitou a vibração.')}
              >
                <Vibrate className="h-4 w-4" aria-hidden="true" /> Testar vibração
              </button>
            )}
          </>
        )}
      </div>

      <div className="panel p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Mapeamento</h2>
          <button
            type="button"
            className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cyan"
            onClick={() => { update({ mapping: { ...DEFAULT_MAPPING } }); setMessage('Mapeamento padrão restaurado.'); }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" /> Restaurar padrão
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">Toque em uma ação e depois aperte o botão desejado no controle. Esc cancela.</p>
        <p className="mt-3 min-h-5 text-sm text-ok" role="status" aria-live="polite">{message}</p>
        <ul className="mt-2 divide-y divide-line">
          {ACTIONS.map((a) => {
            const isListening = listening === a;
            const on = actions.includes(a);
            return (
              <li key={a} className="flex items-center justify-between gap-3 py-1.5">
                <span className={`text-sm ${on ? 'text-cyan' : ''}`}>{ACTION_LABEL[a]}</span>
                <button
                  type="button"
                  disabled={!pad}
                  onClick={() => { setMessage(''); setListening(isListening ? null : a); }}
                  aria-pressed={isListening}
                  className={`min-h-11 min-w-24 rounded-xl border px-3 font-mono text-sm transition disabled:opacity-50 ${isListening ? 'animate-pulse border-violet bg-violet/20' : 'border-line-strong'}`}
                >
                  {isListening ? 'Aperte…' : `Botão ${prefs.mapping[a]}`}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
