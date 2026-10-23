'use client';

import { QUALITIES, activeActions, applyDeadzone, recommendQuality, type Action } from '@nexus/core';
import { Hand, Maximize, Minimize, RotateCcw, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useConnection } from '@/lib/connection';
import { useGamepads } from '@/lib/gamepads';
import { usePreferences } from '@/lib/storage';
import { ConnectionIndicator } from './ConnectionIndicator';
import { TouchControls } from './TouchControls';

const KEYS: Record<string, Action> = {
  ArrowUp: 'cima', KeyW: 'cima', ArrowDown: 'baixo', KeyS: 'baixo',
  ArrowLeft: 'esquerda', KeyA: 'esquerda', ArrowRight: 'direita', KeyD: 'direita',
  KeyJ: 'confirmar', Space: 'confirmar', KeyK: 'voltar', KeyU: 'acao3', KeyI: 'acao4', Enter: 'iniciar',
};

type FsDoc = Document & { webkitFullscreenElement?: Element; webkitExitFullscreen?: () => void; webkitFullscreenEnabled?: boolean };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

function fullscreenElement() {
  const d = document as FsDoc;
  return d.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

/**
 * Sala de teste local. Renderiza um padrão de teste no próprio aparelho para
 * validar tela cheia, orientação, toque, controle e teclado antes do
 * streaming existir. Nada aqui é transmitido de um servidor.
 */
export function TestRoom() {
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const touch = useRef(new Set<Action>());
  const keys = useRef(new Set<Action>());
  const pads = useGamepads();
  const padRef = useRef(pads);
  padRef.current = pads;
  const [prefs, update] = usePreferences();
  const mappingRef = useRef(prefs.mapping);
  mappingRef.current = prefs.mapping;
  const conn = useConnection();
  const [isFs, setIsFs] = useState(false);
  const [fsSupported, setFsSupported] = useState(true);
  const [portrait, setPortrait] = useState(false);
  const [coarse, setCoarse] = useState(false);
  const [fps, setFps] = useState(0);
  const [wake, setWake] = useState<'off' | 'on' | 'unsupported'>('off');

  // Capacidades e orientação
  useEffect(() => {
    const d = document as FsDoc;
    setFsSupported(Boolean(document.fullscreenEnabled || d.webkitFullscreenEnabled));
    const mq = window.matchMedia('(orientation: portrait)');
    const pointer = window.matchMedia('(pointer: coarse)');
    const sync = () => { setPortrait(mq.matches); setCoarse(pointer.matches); };
    sync();
    mq.addEventListener('change', sync);
    const onFs = () => setIsFs(Boolean(fullscreenElement()));
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('webkitfullscreenchange', onFs);
    return () => {
      mq.removeEventListener('change', sync);
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('webkitfullscreenchange', onFs);
    };
  }, []);

  // Teclado
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const a = KEYS[e.code];
      if (!a || (e.target as HTMLElement)?.closest('select,input')) return;
      e.preventDefault();
      keys.current.add(a);
    };
    const up = (e: KeyboardEvent) => { const a = KEYS[e.code]; if (a) keys.current.delete(a); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Mantém a tela acesa enquanto a sala estiver aberta (quando o navegador permitir)
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    if (!nav.wakeLock) { setWake('unsupported'); return; }
    let lock: { release: () => Promise<void> } | null = null;
    const acquire = async () => {
      try { lock = await nav.wakeLock!.request('screen'); setWake('on'); } catch { setWake('off'); }
    };
    const onVis = () => { if (document.visibilityState === 'visible') acquire(); };
    acquire();
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release().catch(() => {}); };
  }, []);

  // Laço de desenho: padrão de teste + avatar controlado pela entrada
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    let frames = 0;
    let lastFps = performance.now();
    const pos = { x: 0.5, y: 0.5 };
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.round(c.clientWidth * dpr);
      c.height = Math.round(c.clientHeight * dpr);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(c);
    resize();

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const W = c.width, H = c.height;
      const pad = padRef.current[0];
      const active = new Set<Action>([...touch.current, ...keys.current, ...(pad ? activeActions(pad.buttons.map((b) => b.pressed), mappingRef.current) : [])]);
      let [vx, vy] = pad ? applyDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0) : [0, 0];
      if (active.has('esquerda')) vx = -1;
      if (active.has('direita')) vx = 1;
      if (active.has('cima')) vy = -1;
      if (active.has('baixo')) vy = 1;
      const speed = active.has('confirmar') ? 0.9 : 0.45;
      pos.x = Math.min(0.97, Math.max(0.03, pos.x + vx * speed * dt));
      pos.y = Math.min(0.95, Math.max(0.05, pos.y + vy * speed * dt));
      if (active.has('iniciar')) { pos.x = 0.5; pos.y = 0.5; }

      // Fundo e grade
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#05060f');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(148,163,255,0.12)'; ctx.lineWidth = 1;
      const step = Math.max(24, W / 24);
      for (let x = 0; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += step) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      // Barra de ritmo de quadros: se tremer ou pular, o aparelho está perdendo quadros
      const bx = ((now / 1000) % 2) / 2 * W;
      ctx.fillStyle = 'rgba(56,214,245,0.25)'; ctx.fillRect(bx, 0, Math.max(6, W / 120), H);
      // Avatar
      const r = Math.max(14, Math.min(W, H) * 0.04);
      ctx.shadowColor = active.size ? '#38d6f5' : '#8b5cf6'; ctx.shadowBlur = r * 1.5;
      ctx.fillStyle = active.has('voltar') ? '#f472b6' : active.has('acao3') ? '#34d399' : active.has('acao4') ? '#fbbf24' : '#4f7dff';
      ctx.beginPath(); ctx.arc(pos.x * W, pos.y * H, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      // Texto de entradas
      ctx.fillStyle = 'rgba(232,235,247,0.85)';
      ctx.font = `${Math.round(Math.max(12, H * 0.03))}px ui-monospace, monospace`;
      ctx.fillText(`entradas: ${[...active].join(' ') || '—'}`, 16, H - 16);

      frames++;
      if (now - lastFps >= 1000) { setFps(frames); frames = 0; lastFps = now; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  const toggleFs = useCallback(async () => {
    const el = stage.current as FsEl | null;
    if (!el) return;
    const d = document as FsDoc;
    try {
      if (fullscreenElement()) {
        await (document.exitFullscreen?.() ?? d.webkitExitFullscreen?.());
        return;
      }
      await (el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.());
      // Bloqueio de orientação só existe em alguns navegadores Android e apenas em tela cheia.
      const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      await o?.lock?.('landscape').catch(() => {});
    } catch {
      setFsSupported(false);
    }
  }, []);

  const onTouch = useCallback((a: Action, down: boolean) => {
    if (down) touch.current.add(a); else touch.current.delete(a);
  }, []);

  const recommended = conn.grade === 'medindo' ? null : recommendQuality(conn.grade, conn.downlinkMbps ?? undefined);
  const showTouch = prefs.touchOverlay && (coarse || isFs);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ConnectionIndicator state={conn} />
        <span className="chip">{fps ? `${fps} fps no aparelho` : "Medindo fps…"}</span>
        <span className="chip">{pads.length ? `Controle: ${pads[0].id.slice(0, 24)}` : 'Sem controle'}</span>
        {wake === 'on' && <span className="chip text-ok">Tela mantida acesa</span>}
      </div>

      <div ref={stage} className={`relative w-full overflow-hidden ${portrait && coarse && !isFs ? 'aspect-[3/4]' : 'aspect-video'} rounded-2xl border border-line-strong bg-void [&:fullscreen]:rounded-none [&:fullscreen]:border-0`}>
        <canvas ref={canvas} className="absolute inset-0 h-full w-full" aria-label="Padrão de teste controlado pelo controle, toque ou teclado" role="img" />
        <div className="pointer-events-none absolute left-3 top-3 z-10">
          <span className="chip max-w-[calc(100vw-7rem)] whitespace-normal border-violet/60 bg-void/70 text-[#c4b5fd]">Demonstração local · nenhum jogo está sendo transmitido</span>
        </div>
        {showTouch && <TouchControls onChange={onTouch} vibrate={prefs.vibration} />}
        <button
          type="button"
          onClick={toggleFs}
          className="absolute right-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-xl border border-white/20 bg-void/70 backdrop-blur"
          aria-label={isFs ? 'Sair da tela cheia' : 'Tela cheia'}
        >
          {isFs ? <Minimize className="h-5 w-5" aria-hidden="true" /> : <Maximize className="h-5 w-5" aria-hidden="true" />}
        </button>
      </div>

      {portrait && coarse && (
        <p className="mt-3 flex items-center gap-2 text-sm text-warn" role="status">
          <RotateCcw className="h-4 w-4" aria-hidden="true" /> Gire o celular para a horizontal para uma área de jogo maior.
        </p>
      )}
      {!fsSupported && (
        <p className="mt-3 flex gap-2 text-sm text-muted" role="status">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Este navegador não permite tela cheia para esta área (no iPhone, o Safari só faz isso com vídeos). Para esconder as
          barras do navegador, use Compartilhar → Adicionar à Tela de Início e abra o NEXUS pelo ícone.
        </p>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <label className="panel block p-5 text-sm">
          <span className="font-semibold">Qualidade do streaming</span>
          <select className="field mt-2" value={prefs.quality} onChange={(e) => update({ quality: e.target.value as typeof prefs.quality })}>
            <option value="auto">Automática{recommended ? ` (agora: ${recommended})` : ''}</option>
            {QUALITIES.map((q) => <option key={q} value={q}>{q}</option>)}
          </select>
          <span className="mt-2 block text-xs text-faint">Preferência salva para as sessões. A qualidade automática segue a conexão medida.</span>
        </label>
        <label className="panel flex cursor-pointer items-start gap-3 p-5 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-violet)]" checked={prefs.touchOverlay} onChange={(e) => update({ touchOverlay: e.target.checked })} />
          <span>
            <span className="flex items-center gap-1.5 font-semibold"><Hand className="h-4 w-4" aria-hidden="true" /> Controles de toque</span>
            <span className="mt-1 block text-xs text-faint">Aparecem em telas de toque e em tela cheia.</span>
          </span>
        </label>
        <label className="panel flex cursor-pointer items-start gap-3 p-5 text-sm">
          <input type="checkbox" className="mt-0.5 h-5 w-5 accent-[var(--color-violet)]" checked={prefs.vibration} onChange={(e) => update({ vibration: e.target.checked })} />
          <span>
            <span className="font-semibold">Vibrar ao tocar</span>
            <span className="mt-1 block text-xs text-faint">Só em aparelhos que oferecem vibração ao navegador (não inclui iPhone).</span>
          </span>
        </label>
      </div>
      <p className="mt-4 text-xs text-faint">Teclado: setas ou WASD movem, J/Espaço = A, K = B, U = X, I = Y, Enter = Start.</p>
    </div>
  );
}
