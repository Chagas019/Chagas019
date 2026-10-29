"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { PanelLeftClose, PanelLeftOpen, Swords } from "lucide-react";
import { IdeaLauncher } from "@/components/studio/idea-launcher";
import { CreateMenu } from "./create-menu";
import { Logo } from "./logo";
import { NAV_ITEMS, isActivePath } from "./nav-items";
import { cn } from "@/lib/utils";

/**
 * Navegação flutuante do desktop: rótulos + indicador animado da seção ativa,
 * criação, ferramentas criativas e progresso. Pode ser recolhida (lembrada em cookie).
 */
export function Sidebar({
  signedIn,
  isModerator,
  initialCollapsed,
  daily,
  progress,
}: {
  signedIn: boolean;
  isModerator: boolean;
  initialCollapsed: boolean;
  daily: { title: string };
  progress: { done: number; total: number } | null;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.nav = next ? "collapsed" : "expanded";
    document.cookie = `frame_nav=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  };
  const items = NAV_ITEMS.filter((i) => !i.auth || signedIn);

  return (
    <aside
      aria-label="Navegação principal"
      className={cn(
        "fixed bottom-3 left-3 top-3 z-[var(--z-nav)] hidden flex-col rounded-[28px] bg-ink-900/85 p-3 ring-1 ring-white/[0.07] backdrop-blur-xl transition-[width] duration-300 ease-[var(--ease-out-expo)] lg:flex",
        collapsed ? "w-[var(--sidebar-w-collapsed)]" : "w-[var(--sidebar-w)]",
      )}
    >
      <div className={cn("flex items-center px-2 pb-4 pt-1", collapsed ? "justify-center" : "justify-between")}>
        {collapsed ? null : <Logo />}
        <button type="button" onClick={toggle} aria-pressed={collapsed} aria-label={collapsed ? "Expandir navegação" : "Recolher navegação"} className="grid size-9 place-items-center rounded-full text-fog-400 hover:bg-white/[0.06] hover:text-paper">
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>

      <CreateMenu signedIn={signedIn} isModerator={isModerator} variant="sidebar" />

      <nav className="mt-4 flex-1 overflow-y-auto">
        <ul className="space-y-0.5">
          {items.map((it) => {
            const active = isActivePath(pathname, it.href);
            return (
              <li key={it.href} className="relative">
                {active ? <motion.span layoutId="nav-active" transition={{ type: "spring", stiffness: 500, damping: 40 }} className="absolute inset-0 rounded-[var(--radius-sm)] bg-white/[0.07]" aria-hidden /> : null}
                {active ? <motion.span layoutId="nav-active-bar" transition={{ type: "spring", stiffness: 500, damping: 40 }} className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-volt-500" aria-hidden /> : null}
                <Link
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? it.label : undefined}
                  className={cn("relative flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm transition-colors", active ? "text-paper" : "text-fog-400 hover:text-paper", collapsed && "justify-center")}
                >
                  <it.icon className={cn("size-5 shrink-0", active && "text-volt-500")} aria-hidden />
                  <span className="nav-label truncate">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-white/[0.06] pt-3">
        <p className="nav-label px-3 pb-1 font-mono text-[10px] uppercase tracking-[0.25em] text-fog-500">Atalhos</p>
        <IdeaLauncher signedIn={signedIn} variant="nav" />
        <Link href="/desafios" className="group flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-fog-300 hover:bg-white/[0.05] hover:text-paper" title={collapsed ? `Desafio do dia: ${daily.title}` : undefined}>
          <Swords className="size-5 shrink-0 text-[#ff8f4d]" aria-hidden />
          <span className="nav-label min-w-0">
            <span className="block font-mono text-[10px] uppercase tracking-[0.2em] text-fog-500">Desafio do dia</span>
            <span className="block truncate">{daily.title}</span>
          </span>
        </Link>
        {progress && progress.total > 0 ? (
          <Link href="/estudio?aba=tarefas" className="nav-label block rounded-[var(--radius-sm)] px-3 py-2.5 hover:bg-white/[0.05]">
            <span className="flex items-baseline justify-between text-xs">
              <span className="font-mono uppercase tracking-[0.2em] text-fog-500">Progresso</span>
              <span className="text-fog-300">
                {progress.done}/{progress.total} tarefas
              </span>
            </span>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-ink-700" aria-hidden>
              <span className="block h-full rounded-full bg-volt-500" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </span>
          </Link>
        ) : null}
      </div>
    </aside>
  );
}
