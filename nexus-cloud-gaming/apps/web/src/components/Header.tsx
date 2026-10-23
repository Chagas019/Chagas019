'use client';

import { Gamepad2, House, LayoutGrid, Library, Search, Server } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const NAV = [
  { href: '/', label: 'Início', Icon: House },
  { href: '/catalogo', label: 'Catálogo', Icon: LayoutGrid },
  { href: '/biblioteca', label: 'Biblioteca', Icon: Library },
  { href: '/controle', label: 'Controle', Icon: Gamepad2 },
  { href: '/servidores', label: 'Servidores', Icon: Server },
];

function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href);
}

export function Header() {
  const path = usePathname() ?? '/';
  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-void/70 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="NEXUS Cloud Gaming, página inicial" className="rounded-lg">
            <Logo />
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(path, href) ? 'page' : undefined}
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-ink aria-[current=page]:bg-white/8 aria-[current=page]:text-ink"
              >
                {label}
              </Link>
            ))}
            <Link href="/planos" className="rounded-xl px-3.5 py-2 text-sm font-medium text-muted transition hover:bg-white/5 hover:text-ink" aria-current={isActive(path, '/planos') ? 'page' : undefined}>
              Planos
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/catalogo?foco=busca" className="grid h-11 w-11 place-items-center rounded-xl border border-line-strong text-muted transition hover:text-ink" aria-label="Pesquisar jogos">
              <Search className="h-5 w-5" aria-hidden="true" />
            </Link>
            <button type="button" disabled className="btn btn-ghost hidden min-h-11 sm:inline-flex" title="Contas chegam na Fase 3">
              Entrar <span className="text-xs text-faint">em breve</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navegação inferior no celular: no máximo 5 itens, alvos de 44 px e área segura do iPhone. */}
      <nav
        aria-label="Principal (celular)"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-void/85 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium transition ${active ? 'text-ink' : 'text-faint'}`}
                >
                  <Icon className={`h-5 w-5 ${active ? 'text-cyan drop-shadow-[0_0_8px_rgb(56_214_245/0.7)]' : ''}`} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
