import type { Game } from '@nexus/core';
import { Bomb, Box, CarFront, Cog, Crosshair, Crown, MountainSnow, Shield, Sword, TrainFront, type LucideIcon } from 'lucide-react';

const GLYPHS: Record<string, LucideIcon> = {
  kart: CarFront,
  jump: MountainSnow,
  target: Crosshair,
  shield: Shield,
  rail: TrainFront,
  crown: Crown,
  cube: Box,
  gear: Cog,
  blast: Bomb,
  sword: Sword,
};

/**
 * Capa gerada pelo próprio NEXUS (gradiente, grade em perspectiva e ícone).
 * Evita usar artes de terceiros sem direito de uso; quando houver arte
 * licenciada, ela entra aqui no lugar do ícone.
 */
export function GameCover({ game, size = 'card' }: { game: Game; size?: 'card' | 'hero' }) {
  const Glyph = GLYPHS[game.cover.glyph] ?? Box;
  const hero = size === 'hero';
  return (
    <div
      className="relative isolate h-full w-full overflow-hidden"
      style={{ background: `linear-gradient(145deg, ${game.cover.from}, ${game.cover.to} 70%, #05060f)` }}
      role="img"
      aria-label={`Capa ilustrativa de ${game.name}`}
    >
      {/* Grade em perspectiva */}
      <div
        className="absolute inset-x-[-20%] bottom-[-30%] h-[70%] opacity-40 [transform:perspective(320px)_rotateX(62deg)]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / .35) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .35) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'linear-gradient(to top, black, transparent)',
        }}
        aria-hidden="true"
      />
      <div className="absolute -right-6 -top-10 h-40 w-40 rounded-full bg-white/15 blur-3xl" aria-hidden="true" />
      <Glyph
        className={`absolute text-white/90 drop-shadow-[0_0_24px_rgb(255_255_255/0.45)] ${
          hero ? 'right-[8%] top-1/2 h-32 w-32 -translate-y-1/2 sm:h-44 sm:w-44' : 'right-4 top-[38%] h-16 w-16 -translate-y-1/2'
        }`}
        strokeWidth={1.4}
        aria-hidden="true"
      />
      {!hero && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
          <p className="font-display text-lg font-bold leading-tight text-white">{game.name}</p>
        </div>
      )}
    </div>
  );
}
