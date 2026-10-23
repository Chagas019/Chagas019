import { AVAILABILITY_LABEL, FAMILY_LABEL, GAMES, PLATFORMS } from '@nexus/core';
import Link from 'next/link';

const FAMILY_GRADIENT = {
  playstation: 'from-[#1d4ed8]/40',
  xbox: 'from-[#15803d]/40',
  nintendo: 'from-[#be123c]/40',
  pc: 'from-[#7c3aed]/40',
  livre: 'from-[#0891b2]/40',
};

export function PlatformGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {PLATFORMS.map((p) => {
        const count = GAMES.filter((g) => g.platform === p.id).length;
        return (
          <li key={p.id}>
            <Link
              href={`/plataformas/${p.id}`}
              className={`group relative flex h-full min-h-32 flex-col justify-between overflow-hidden rounded-2xl border border-line bg-gradient-to-br ${FAMILY_GRADIENT[p.family]} to-surface p-4 transition duration-300 hover:-translate-y-0.5 hover:border-line-strong`}
            >
              <span className="font-display text-3xl font-bold text-white/15 transition group-hover:text-white/25" aria-hidden="true">
                {p.short}
              </span>
              <span>
                <span className="block text-xs text-faint">{FAMILY_LABEL[p.family]}</span>
                <span className="block font-semibold leading-tight">{p.name}</span>
                <span className="mt-1 block text-xs text-muted">
                  {count > 0 ? `${count} ${count === 1 ? 'título' : 'títulos'} · ` : ''}
                  {AVAILABILITY_LABEL[p.defaultAvailability]}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
