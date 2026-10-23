'use client';

import { activeActions, applyDeadzone, type Action, type Game as CatalogGame } from '@nexus/core';
import { ArrowLeft, Maximize, Minimize, Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BROWSER_GAME_FACTORIES } from '@/games';
import type { Game, Input } from '@/games/types';
import { useGamepads } from '@/lib/gamepads';
import { useBestScore, usePreferences } from '@/lib/storage';
import { TouchControls } from './TouchControls';

type Phase = 'pronto' | 'jogando' | 'pausado' | 'fim';

const KEYS: Record<string, Action> = {
  ArrowUp: 'cima', KeyW: 'cima', ArrowDown: 'baixo', KeyS: 'baixo',
  ArrowLeft: 'esquerda', KeyA: 'esquerda', ArrowRight: 'direita', KeyD: 'direita',
  Space: 'confirmar', KeyJ: 'confirmar', KeyK: 'voltar', Enter: 'iniciar', KeyP: 'iniciar', Escape: 'iniciar',
};

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

/**
 * Player dos jogos que rodam no navegador. Junta controle (com o
 * mapeamento salvo), toque e teclado numa entrada única e roda o laço do
 * jogo com `requestAnimationFrame`. Pausa sozinho ao trocar de aba.
 */
export function GamePlayer({ game }: { game: CatalogGame }) {
  const factory = BROWSER_GAME_FACTORIES[game.slug];
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const instance = useRef<Game | null>(null);
  const held = useRef(new Set<Action>());
  const touch = useRef(new Set<Action>());
  const keys = useRef(new Set<Action>());
  /** Apertos rápidos (apertou e soltou entre dois quadros) valem até o próximo quadro. */
  const taps = useRef(new Set<Action>());
  const pads = useGamepads();
  const padsRef = useRef(pads);
  padsRef.current = pads;
  const [prefs] = usePreferences();
  const mappingRef = useRef(prefs.mapping);
  mappingRef.current = prefs.mapping;
  const [best, submitBest] = useBestScore(game.slug);
  const bestRef = useRef(best);
  bestRef.current = best;
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  // Lido de uma instância descartável: a instância real só nasce no efeito, depois da renderização.
  const [hint] = useState(() => factory().hint);
  const [phase, setPhase] = useState<Phase>('pronto');
  const phaseRef = useRef<Phase>('pronto');
  const [score, setScore] = useState(0);
  const [isFs, setIsFs] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [newRecord, setNewRecord] = useState(false);

  const go = useCallback((p: Phase) => { phaseRef.current = p; setPhase(p); }, []);

  const start = useCallback(() => {
    const c = canvas.current;
    instance.current = factory();
    if (c) instance.current.resize(c.clientWidth, c.clientHeight);
    // `held` não é limpo: o botão que reiniciou ainda está apertado e não pode contar como novo aperto (pausaria na hora).
    setScore(0);
    setNewRecord(false);
    go('jogando');
  }, [factory, go]);

  // Orientação, tipo de ponteiro e tela cheia
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const pointer = window.matchMedia('(pointer: coarse)');
    const sync = () => { setPortrait(mq.matches); setCoarse(pointer.matches); };
    sync();
    mq.addEventListener('change', sync);
    const onFs = () => {
      const d = document as FsDoc;
      setIsFs(Boolean(d.fullscreenElement ?? d.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    const onVis = () => { if (document.visibilityState === 'hidden' && phaseRef.current === 'jogando') go('pausado'); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      mq.removeEventListener('change', sync);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [go]);

  // Teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const a = KEYS[e.code];
      if (!a || e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      keys.current.add(a);
      if (!e.repeat) taps.current.add(a);
    };
    const up = (e: KeyboardEvent) => { const a = KEYS[e.code]; if (a) keys.current.delete(a); };
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  // Laço principal
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let last = performance.now();
    let shownScore = -1;

    instance.current ??= factory();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (c.clientWidth > 0 && c.clientHeight > 0) instance.current?.resize(c.clientWidth, c.clientHeight);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const pad = padsRef.current[0];
      const current = new Set<Action>([...taps.current, ...touch.current, ...keys.current, ...(pad ? activeActions(pad.buttons.map((b) => b.pressed), mappingRef.current) : [])]);
      const pressed = new Set([...current].filter((a) => !held.current.has(a)));
      held.current = current;
      taps.current.clear();

      let [x, y] = pad ? applyDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0) : [0, 0];
      if (current.has('esquerda')) x = -1;
      if (current.has('direita')) x = 1;
      if (current.has('cima')) y = -1;
      if (current.has('baixo')) y = 1;
      const input: Input = { held: current, pressed, x, y };

      const phaseNow = phaseRef.current;
      const g = instance.current!;
      if (phaseNow === 'jogando') {
        if (pressed.has('iniciar')) go('pausado');
        else {
          g.update(dt, input);
          if (g.over) {
            go('fim');
            setNewRecord(g.score > 0 && g.score > bestRef.current);
            submitBest(g.score);
            if (prefsRef.current.vibration && 'vibrate' in navigator) navigator.vibrate(120);
          }
        }
      } else if (phaseNow === 'pausado') {
        if (pressed.has('iniciar') || pressed.has('confirmar')) go('jogando');
      } else if (pressed.has('confirmar') || pressed.has('iniciar')) {
        start();
      }

      g.draw(ctx);
      if (g.score !== shownScore) { shownScore = g.score; setScore(g.score); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [factory, go, start, submitBest]);

  const toggleFs = useCallback(async () => {
    const el = stage.current as FsEl | null;
    const d = document as FsDoc;
    try {
      if (d.fullscreenElement ?? d.webkitFullscreenElement) {
        await (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
      } else if (el) {
        await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
      }
    } catch {
      // Sem suporte (iPhone): o jogo continua na página.
    }
  }, []);

  const onTouch = useCallback((a: Action, down: boolean) => {
    if (down) { touch.current.add(a); taps.current.add(a); } else touch.current.delete(a);
  }, []);

  // Toque direto na tela de jogo = botão A (pular, lançar, atirar).
  const tapDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    touch.current.add('confirmar');
    taps.current.add('confirmar');
  };
  const tapUp = () => touch.current.delete('confirmar');

  const touchBelow = coarse && portrait && !isFs;
  const touchOverlay = coarse && !touchBelow;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Link href={`/jogo/${game.slug}`} className="flex min-h-11 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {game.name}
        </Link>
        <div className="flex items-center gap-2">
          <span className="chip" data-testid="score" aria-live="off">Pontos {score}</span>
          <span className="chip text-amber-300" data-testid="best"><Trophy className="h-3.5 w-3.5" aria-hidden="true" /> {best}</span>
        </div>
      </div>

      <div
        ref={stage}
        style={touchBelow ? { maxHeight: 'calc(100dvh - 19rem)' } : undefined}
        className={`relative w-full select-none overflow-hidden rounded-2xl border border-line-strong bg-void ${portrait && coarse && !isFs ? 'aspect-[3/4]' : 'aspect-video'} [&:fullscreen]:rounded-none [&:fullscreen]:border-0`}
      >
        <canvas
          ref={canvas}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={tapDown}
          onPointerUp={tapUp}
          onPointerCancel={tapUp}
          onPointerLeave={tapUp}
          role="img"
          aria-label={`Tela do jogo ${game.name}`}
        />

        <div className="absolute right-3 top-3 z-30 flex gap-2">
          {phase === 'jogando' && (
            <button type="button" onClick={() => go('pausado')} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-void/70 backdrop-blur" aria-label="Pausar">
              <Pause className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
          <button type="button" onClick={toggleFs} className="grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-void/70 backdrop-blur" aria-label={isFs ? 'Sair da tela cheia' : 'Tela cheia'}>
            {isFs ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {isFs && <div className="pointer-events-none absolute left-3 top-3 z-30 chip bg-void/70">Pontos {score} · Recorde {best}</div>}

        {phase !== 'jogando' && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-void/70 p-6 text-center backdrop-blur-sm" role="dialog" aria-label={phase === 'fim' ? 'Fim de jogo' : phase === 'pausado' ? 'Jogo pausado' : `Começar ${game.name}`}>
            <div>
              <p className="eyebrow">{phase === 'fim' ? 'Fim de jogo' : phase === 'pausado' ? 'Pausado' : 'Pronto?'}</p>
              <p className="mt-2 font-display text-3xl font-bold sm:text-4xl">{phase === 'fim' ? `${score} pontos` : game.name}</p>
              {phase === 'fim' && newRecord && <p className="mt-2 font-semibold text-amber-300">Novo recorde!</p>}
              {phase === 'pronto' && <p className="mx-auto mt-3 max-w-xs text-sm text-muted">{hint}</p>}
              <button
                type="button"
                onClick={() => (phase === 'pausado' ? go('jogando') : start())}
                className="btn btn-primary mt-6 h-14 px-8 text-base"
                autoFocus
              >
                {phase === 'fim' ? <RotateCcw className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5 fill-current" aria-hidden="true" />}
                {phase === 'fim' ? 'Jogar de novo' : phase === 'pausado' ? 'Continuar' : 'Começar'}
              </button>
              <p className="mt-3 text-xs text-faint">ou aperte A / Start no controle, Espaço ou Enter no teclado</p>
            </div>
          </div>
        )}

        {touchOverlay && phase === 'jogando' && <TouchControls onChange={onTouch} vibrate={prefs.vibration} />}
      </div>

      {touchBelow && (
        <div className="relative mt-3 h-48" aria-label="Controles de toque">
          <TouchControls onChange={onTouch} vibrate={prefs.vibration} />
        </div>
      )}

      <p className="mt-4 text-xs text-faint">
        Roda neste aparelho, sem servidor. Controle: direcional/analógico movem, A age, Start pausa. Teclado: setas ou WASD,
        Espaço = A, Enter ou P = pausa. Recorde salvo só neste aparelho.
      </p>
    </div>
  );
}
