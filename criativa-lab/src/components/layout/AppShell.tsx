"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import {
  BookOpen,
  ChartLine,
  Flame,
  FolderOpen,
  House,
  Library,
  LogOut,
  Menu,
  Settings,
  Target,
  WandSparkles,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useApp } from "@/lib/store";
import { Logo } from "@/components/ui/bits";

export const NAV = [
  { href: "/inicio", label: "Início", icon: House },
  { href: "/desafios", label: "Desafios", icon: Target },
  { href: "/referencias", label: "Referências", icon: Library },
  { href: "/academia", label: "Academia", icon: BookOpen },
  { href: "/gerador", label: "Gerador de ideias", icon: WandSparkles },
  { href: "/portfolio", label: "Meu portfólio", icon: FolderOpen },
  { href: "/progresso", label: "Meu progresso", icon: ChartLine },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

const MOBILE_TABS = ["/inicio", "/desafios", "/gerador", "/referencias", "/portfolio"];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${
                active ? "text-ink" : "text-fog hover:bg-white/[0.04] hover:text-paper"
              }`}
            >
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-lime"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon className="relative size-[18px] transition-transform duration-300 group-hover:scale-110" aria-hidden />
              <span className="relative">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserCard() {
  const { data, stats, signOut, backend } = useApp();
  const router = useRouter();
  if (!data) return null;
  const initials = data.profile.name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className="space-y-3">
      <Link href="/progresso" className="card block p-3 transition hover:border-line-strong">
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-full bg-steel font-display text-sm font-semibold">{initials || "?"}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{data.profile.name}</p>
            <p className="truncate text-xs text-fog">
              Nv. {stats.level.level} · {stats.level.name}
            </p>
          </div>
          {stats.streak > 0 && (
            <span className="flex items-center gap-1 text-xs text-lime" title={`${stats.streak} dias seguidos`}>
              <Flame className="size-3.5" />
              {stats.streak}
            </span>
          )}
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.07]">
          <div className="h-full rounded-full bg-lime transition-[width] duration-700" style={{ width: `${stats.level.progress * 100}%` }} />
        </div>
      </Link>
      <div className="flex items-center justify-between px-1">
        <span className="label !text-[10px]">{backend.mode === "local" ? "Modo local" : "Sincronizado"}</span>
        <button
          onClick={async () => {
            await signOut();
            router.replace("/entrar");
          }}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-fog transition hover:bg-white/5 hover:text-paper"
        >
          <LogOut className="size-3.5" /> Sair
        </button>
      </div>
    </div>
  );
}

/** Luz sutil que acompanha o cursor no fundo da área de trabalho. */
function CursorGlow() {
  const reduce = useReducedMotion();
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const sx = useSpring(x, { stiffness: 120, damping: 24 });
  const sy = useSpring(y, { stiffness: 120, damping: 24 });
  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX - 300);
      y.set(e.clientY - 300);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce, x, y]);
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-0 hidden size-[600px] rounded-full opacity-60 lg:block"
      style={{ x: sx, y: sy, background: "radial-gradient(circle, rgb(212 255 58 / 0.05), transparent 60%)" }}
    />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { status } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (status === "anonymous") router.replace(`/entrar?next=${encodeURIComponent(pathname)}`);
  }, [status, router, pathname]);

  useEffect(() => setDrawer(false), [pathname]);

  if (status !== "ready") {
    return (
      <div className="grid min-h-dvh place-items-center" aria-busy="true">
        <div className="flex flex-col items-center gap-4">
          <Logo />
          <div className="h-0.5 w-40 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full w-1/3 bg-lime"
              animate={{ x: ["-100%", "300%"] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
            />
          </div>
          <span className="sr-only">Carregando…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <CursorGlow />

      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh flex-col justify-between border-r border-line bg-coal/80 px-4 py-6 lg:flex">
        <div>
          <Link href="/inicio" className="mb-10 block px-2" aria-label="CRIATIVA LAB — início">
            <Logo />
          </Link>
          <nav aria-label="Navegação principal">
            <NavList />
          </nav>
        </div>
        <UserCard />
      </aside>

      {/* Topo mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-ink/85 px-4 py-3 backdrop-blur-md lg:hidden">
        <Link href="/inicio" aria-label="CRIATIVA LAB — início">
          <Logo />
        </Link>
        <button
          onClick={() => setDrawer(true)}
          aria-label="Abrir menu"
          aria-expanded={drawer}
          className="grid size-10 place-items-center rounded-full border border-line"
        >
          <Menu className="size-5" />
        </button>
      </header>

      <AnimatePresence>
        {drawer && (
          <motion.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button className="absolute inset-0 bg-black/70" aria-label="Fechar menu" onClick={() => setDrawer(false)} />
            <motion.nav
              aria-label="Menu"
              className="absolute right-0 top-0 flex h-full w-[min(86vw,320px)] flex-col justify-between border-l border-line bg-coal p-5"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
            >
              <div>
                <div className="mb-8 flex items-center justify-between">
                  <Logo />
                  <button onClick={() => setDrawer(false)} aria-label="Fechar menu" className="grid size-10 place-items-center rounded-full border border-line">
                    <X className="size-5" />
                  </button>
                </div>
                <NavList onNavigate={() => setDrawer(false)} />
              </div>
              <UserCard />
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>

      <main id="conteudo" className="relative z-10 min-w-0 px-4 pb-28 pt-8 sm:px-8 lg:px-12 lg:pb-16 lg:pt-12">
        <div className="mx-auto max-w-[1240px]">{children}</div>
      </main>

      {/* Tab bar mobile */}
      <nav
        aria-label="Atalhos"
        className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-2xl border border-line bg-coal/90 p-1.5 backdrop-blur-md lg:hidden"
      >
        {NAV.filter((n) => MOBILE_TABS.includes(n.href)).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[10px] ${active ? "text-ink" : "text-fog"}`}
            >
              {active && <motion.span layoutId="tab-active" className="absolute inset-0 rounded-xl bg-lime" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <Icon className="relative size-[18px]" aria-hidden />
              <span className="relative leading-none">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
