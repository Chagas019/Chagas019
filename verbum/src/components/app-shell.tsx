"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Search, Music2, Mic2, Library, Sparkles, Compass, FolderHeart, Settings, LogIn, LogOut, Menu, X } from "lucide-react";
import { Logo } from "./brand";
import { useApp } from "./providers";

export const NAV = [
  { href: "/painel", label: "Início", icon: Home },
  { href: "/pesquisa", label: "Pesquisar", icon: Search },
  { href: "/assistente", label: "Preparar pregação", icon: Sparkles },
  { href: "/musicas", label: "Músicas", icon: Music2 },
  { href: "/pregacoes", label: "Pregações", icon: Mic2 },
  { href: "/biblioteca", label: "Biblioteca", icon: Library },
  { href: "/explorar", label: "Explorar", icon: Compass },
  { href: "/meu-espaco", label: "Meu Espaço", icon: FolderHeart },
];

const MOBILE = ["/painel", "/pesquisa", "/assistente", "/explorar", "/meu-espaco"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { user, supabaseConfigured, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className="min-h-screen bg-ivory-100">
      <a href="#conteudo" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-royal-900 focus:px-4 focus:py-2 focus:text-ivory-50">Pular para o conteúdo</a>
      <header className="sticky top-0 z-40 border-b border-ivory-300/60 bg-ivory-50/85 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Logo href="/painel" />
          <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 xl:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className={`rounded-full px-3 py-1.5 text-sm transition ${active(n.href) ? "bg-royal-800 text-ivory-50" : "text-ink-soft hover:bg-ivory-200 hover:text-royal-800"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/configuracoes" aria-label="Configurações" className={`rounded-full p-2 transition hover:bg-ivory-200 ${active("/configuracoes") ? "text-royal-800" : "text-ink-soft"}`}>
              <Settings className="h-5 w-5" />
            </Link>
            {supabaseConfigured && (user ? (
              <button onClick={signOut} className="hidden items-center gap-1.5 rounded-full border border-ivory-300 px-3 py-1.5 text-sm text-ink-soft hover:border-royal-300 sm:inline-flex">
                <LogOut className="h-4 w-4" /> Sair
              </button>
            ) : (
              <Link href={`/entrar?voltar=${encodeURIComponent(path)}`} className="hidden items-center gap-1.5 rounded-full bg-royal-800 px-4 py-1.5 text-sm font-medium text-ivory-50 hover:bg-royal-700 sm:inline-flex">
                <LogIn className="h-4 w-4" /> Entrar
              </Link>
            ))}
            <button className="rounded-full p-2 text-ink-soft hover:bg-ivory-200 xl:hidden" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open}>
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button className="absolute inset-0 bg-royal-900/40" aria-label="Fechar menu" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 max-w-[85vw] animate-fade-up flex-col gap-1 bg-ivory-50 p-5 shadow-lift">
            <button className="mb-3 self-end rounded-full p-2 hover:bg-ivory-200" onClick={() => setOpen(false)} aria-label="Fechar menu"><X className="h-5 w-5" /></button>
            {[...NAV, { href: "/configuracoes", label: "Configurações", icon: Settings }].map((n) => (
              <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active(n.href) ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] ${active(n.href) ? "bg-royal-800 text-ivory-50" : "text-ink hover:bg-ivory-200"}`}>
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            ))}
            {supabaseConfigured && (user ? (
              <button onClick={() => { setOpen(false); signOut(); }} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink hover:bg-ivory-200"><LogOut className="h-4 w-4" /> Sair</button>
            ) : (
              <Link href="/entrar" onClick={() => setOpen(false)} className="mt-auto flex items-center justify-center gap-2 rounded-full bg-royal-800 px-4 py-2.5 text-ivory-50"><LogIn className="h-4 w-4" /> Entrar</Link>
            ))}
          </div>
        </div>
      )}

      <main id="conteudo" className="mx-auto max-w-7xl px-4 pb-28 pt-8 sm:px-6 sm:pt-10 xl:pb-16">{children}</main>

      <nav aria-label="Atalhos" className="fixed inset-x-0 bottom-0 z-40 border-t border-ivory-300/70 bg-ivory-50/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md xl:hidden print:hidden">
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {NAV.filter((n) => MOBILE.includes(n.href)).map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={active(n.href) ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active(n.href) ? "text-royal-800" : "text-ink-mute"}`}>
                <n.icon className={`h-5 w-5 ${active(n.href) ? "text-gold-500" : ""}`} />
                {n.label === "Preparar pregação" ? "Preparar" : n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
