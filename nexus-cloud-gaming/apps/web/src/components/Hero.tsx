import { GAMES, type Game } from '@nexus/core';
import { Gamepad2, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GameCover } from './GameCover';

/**
 * Hero cinematográfico com profundidade feita só com CSS 3D (sem WebGL):
 * chão em grade animado, anel orbital e três capas em leque flutuando.
 * Tudo é transform/opacity, para manter 60 fps em celulares modestos.
 */
export function Hero() {
  const stack = ['void-runner', 'neon-breaker', 'starfall'].map((s) => GAMES.find((g) => g.slug === s)!) as Game[];
  return (
    <section aria-labelledby="hero-titulo" className="relative isolate overflow-hidden">
      {/* Chão em grade com fuga para o horizonte */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[55%] [perspective:600px]" aria-hidden="true">
        <div
          className="absolute inset-x-[-50%] bottom-[-10%] h-[160%] origin-bottom animate-grid [transform:rotateX(68deg)]"
          style={{
            backgroundImage:
              'linear-gradient(rgb(79 125 255 / .35) 1px, transparent 1px), linear-gradient(90deg, rgb(139 92 246 / .3) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
            maskImage: 'linear-gradient(to top, black 10%, transparent 75%)',
            WebkitMaskImage: 'linear-gradient(to top, black 10%, transparent 75%)',
          }}
        />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[20%] -z-10 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgb(124_92_255/0.35),transparent_65%)] blur-2xl" aria-hidden="true" />

      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-28 lg:pt-20">
        <div>
          <span className="chip border-violet/50 text-[#c4b5fd]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Jogos já disponíveis
          </span>
          <h1 id="hero-titulo" className="mt-5 text-[2.6rem] font-bold leading-[1.02] sm:text-6xl lg:text-7xl">
            <span className="text-gradient">Seu universo gamer.</span>
            <br />
            Em qualquer tela.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            Jogue agora pelo navegador do celular, com toque ou controle Bluetooth, sem instalar nada. O streaming de
            jogos maiores direto da nuvem está em construção.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/catalogo?disponibilidade=operacional" className="btn btn-primary h-14 px-7 text-base">
              <Play className="h-5 w-5 fill-current" aria-hidden="true" /> Jogar agora
            </Link>
            <Link href="/controle" className="btn btn-ghost h-14 px-6 text-base">
              <Gamepad2 className="h-5 w-5" aria-hidden="true" /> Conectar controle
            </Link>
          </div>
          <p className="mt-4 text-xs text-faint">
            Jogos marcados como “Em breve” dependem do streaming na nuvem, ainda não ativo.
          </p>
        </div>

        {/* Leque 3D de capas */}
        <div className="relative mx-auto h-[22rem] w-full max-w-md [perspective:1100px] sm:h-[28rem]" aria-hidden="true">
          {/* Plataforma luminosa sob as capas */}
          <div className="absolute left-1/2 top-[84%] h-16 w-[85%] -translate-x-1/2 rounded-[50%] border border-cyan/50 bg-[radial-gradient(closest-side,rgb(56_214_245/0.35),transparent)] shadow-[0_0_40px_rgb(56_214_245/0.45)]" />
          <div className="absolute inset-0 animate-float [transform-style:preserve-3d]">
            {stack.map((g, i) => (
              <div
                key={g.slug}
                className="absolute left-1/2 top-1/2 h-60 w-44 overflow-hidden rounded-2xl border border-white/15 shadow-[0_40px_60px_-20px_rgb(0_0_0/0.9)] sm:h-72 sm:w-52"
                style={{
                  transform: `translate(-50%, -50%) translateX(${(i - 1) * 46}%) translateZ(${i === 1 ? 80 : 0}px) rotateY(${(i - 1) * -14}deg)`,
                  zIndex: i === 1 ? 2 : 1,
                  filter: i === 1 ? undefined : 'brightness(.7)',
                }}
              >
                <GameCover game={g} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
