'use client';

import { CircleCheck, CircleDashed, CircleX } from 'lucide-react';
import { useEffect, useState } from 'react';

type Result = { name: string; ok: boolean | null; detail: string; why: string };

async function measureRefresh(): Promise<number> {
  return new Promise((resolve) => {
    const times: number[] = [];
    const tick = (t: number) => {
      times.push(t);
      if (times.length < 31) requestAnimationFrame(tick);
      else resolve(Math.round(1000 / ((times[30] - times[0]) / 30)));
    };
    requestAnimationFrame(tick);
  });
}

function webrtcCodecs(): string[] {
  try {
    const caps = (window as Window & { RTCRtpReceiver?: typeof RTCRtpReceiver }).RTCRtpReceiver?.getCapabilities?.('video');
    if (!caps) return [];
    const names = caps.codecs.map((c) => c.mimeType.replace('video/', '').toUpperCase());
    return [...new Set(names)].filter((n) => ['H264', 'H265', 'VP8', 'VP9', 'AV1'].includes(n));
  } catch {
    return [];
  }
}

/**
 * Diagnóstico real do aparelho: detecta, sem suposições por marca ou
 * user-agent, os recursos de que o streaming vai precisar.
 */
export function DeviceCheck() {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    (async () => {
      const d = document as Document & { webkitFullscreenEnabled?: boolean };
      const nav = navigator as Navigator & { standalone?: boolean; connection?: { effectiveType?: string; downlink?: number } };
      const codecs = webrtcCodecs();
      const hz = await measureRefresh();
      const standalone = window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
      const videoFs = 'webkitEnterFullscreen' in HTMLVideoElement.prototype;
      const elementFs = Boolean(document.fullscreenEnabled || d.webkitFullscreenEnabled);
      const lock = typeof (screen.orientation as ScreenOrientation & { lock?: unknown })?.lock === 'function';

      setResults([
        { name: 'WebRTC', ok: 'RTCPeerConnection' in window, detail: 'RTCPeerConnection', why: 'Transporte de vídeo, áudio e controles com baixa latência.' },
        { name: 'Codecs de vídeo WebRTC', ok: codecs.length ? true : false, detail: codecs.join(', ') || 'Nenhum informado', why: 'H.264 é o mais compatível; AV1/H.265 economizam banda quando há suporte.' },
        { name: 'Gamepad API', ok: typeof navigator.getGamepads === 'function', detail: 'navigator.getGamepads', why: 'Controles Bluetooth.' },
        { name: 'Tela cheia de elemento', ok: elementFs, detail: elementFs ? 'Disponível' : videoFs ? 'Só para vídeo (comportamento do iPhone)' : 'Indisponível', why: 'Jogo sem barras do navegador.' },
        { name: 'Bloqueio de orientação', ok: lock ? null : false, detail: lock ? 'API presente (confirmada só ao entrar em tela cheia)' : 'Indisponível', why: 'Fixar a horizontal durante o jogo.' },
        { name: 'Manter tela acesa', ok: 'wakeLock' in navigator, detail: 'Screen Wake Lock', why: 'Evita que a tela apague no meio da partida.' },
        { name: 'Vibração do aparelho', ok: 'vibrate' in navigator, detail: 'navigator.vibrate', why: 'Resposta tátil nos controles de toque.' },
        { name: 'Toque', ok: navigator.maxTouchPoints > 0, detail: `${navigator.maxTouchPoints} pontos simultâneos`, why: 'Controles virtuais.' },
        { name: 'Instalado como app (PWA)', ok: standalone, detail: standalone ? 'Aberto pelo ícone' : 'Aberto no navegador', why: 'No iPhone, é a forma de esconder as barras do Safari.' },
        { name: 'Modo offline', ok: 'serviceWorker' in navigator, detail: 'Service Worker', why: 'Interface abre mesmo sem rede.' },
        { name: 'Tela', ok: true, detail: `${screen.width}×${screen.height} · ${window.devicePixelRatio}x · ~${hz} Hz`, why: 'Escolha de resolução e taxa de quadros.' },
        { name: 'Rede (estimativa do navegador)', ok: nav.connection ? true : null, detail: nav.connection ? `${nav.connection.effectiveType ?? '?'} · ${nav.connection.downlink ?? '?'} Mbps` : 'Não informado por este navegador', why: 'Ponto de partida da qualidade automática.' },
      ]);
    })();
  }, []);

  if (!results) {
    return (
      <div className="panel space-y-3 p-6" aria-busy="true" aria-label="Verificando recursos do aparelho">
        {Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton h-10" />)}
      </div>
    );
  }

  return (
    <ul className="panel divide-y divide-line px-5 sm:px-6" data-testid="device-check">
      {results.map((r) => {
        const Icon = r.ok === true ? CircleCheck : r.ok === false ? CircleX : CircleDashed;
        const color = r.ok === true ? 'text-ok' : r.ok === false ? 'text-bad' : 'text-warn';
        return (
          <li key={r.name} className="flex gap-4 py-4">
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${color}`} aria-label={r.ok === true ? 'Suportado' : r.ok === false ? 'Não suportado' : 'Parcial ou desconhecido'} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-faint">{r.why}</p>
            </div>
            <p className="max-w-[45%] text-right text-sm text-muted">{r.detail}</p>
          </li>
        );
      })}
    </ul>
  );
}
