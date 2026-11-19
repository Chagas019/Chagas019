"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import {
  LayoutDashboard, Radar, PenLine, Send, Package, BadgeCheck, Megaphone, History, BarChart3, Settings, Plug, ScrollText, Bot, OctagonX, Play, LogOut, Menu, X,
} from "lucide-react";
import { api, usePoll } from "@/lib/api";
import { Badge } from "./ui";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agents", label: "Agentes (tempo real)", icon: Bot },
  { href: "/agents/scout", label: "Agente Scout", icon: Radar },
  { href: "/agents/copywriter", label: "Agente Copywriter", icon: PenLine },
  { href: "/agents/distributor", label: "Agente Distributor", icon: Send },
  { href: "/products", label: "Produtos encontrados", icon: Package },
  { href: "/approved", label: "Ofertas aprovadas", icon: BadgeCheck },
  { href: "/publications", label: "Central de publicações", icon: Megaphone },
  { href: "/history", label: "Histórico", icon: History },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Configurações", icon: Settings },
  { href: "/integrations", label: "Integrações", icon: Plug },
  { href: "/logs", label: "Logs do sistema", icon: ScrollText },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const { data: status, reload } = usePoll<any>("system/status", 5000);
  const halted = status?.settings?.systemHalted;
  const paused = status?.settings?.publishingPaused;
  const [busy, setBusy] = useState(false);

  async function toggleStop() {
    if (!halted && !confirm("STOP ALL: interromper imediatamente todos os agentes?")) return;
    setBusy(true);
    try {
      await api(halted ? "system/resume" : "system/stop-all", { method: "POST" });
      await reload();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const nav = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? path === "/" : path === href || (href !== "/agents" && path.startsWith(href + "/"));
        return (
          <Link key={href} href={href} onClick={() => setOpen(false)}
            className={clsx("flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] transition",
              active ? "bg-white/[0.07] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200")}>
            <Icon className={clsx("h-4 w-4", active && "text-electric-400")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      <aside className={clsx("fixed inset-y-0 left-0 z-40 w-64 border-r border-white/[0.06] bg-ink-950/95 p-4 backdrop-blur transition-transform lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="mb-6 flex items-center justify-between px-1">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-electric-400 to-electric-600 shadow-glow"><Radar className="h-4 w-4 text-white" /></div>
            <span className="text-[15px] font-semibold tracking-tight text-white">OFERTA <span className="text-electric-400">AI</span></span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)}><X className="h-5 w-5 text-zinc-400" /></button>
        </div>
        {nav}
        <button onClick={logout} className="absolute bottom-4 left-4 right-4 flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300">
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-white/[0.06] bg-ink-950/80 px-4 backdrop-blur sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5 text-zinc-400" /></button>
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {status?.mode === "sandbox" ? <Badge tone="amber">Ambiente de testes · produtos fictícios · nada é publicado</Badge> : status && <Badge tone="green">Produção · Shopee real</Badge>}
            {halted && <Badge tone="red" pulse>STOP ALL ativo</Badge>}
            {!halted && paused && <Badge tone="amber">Publicação pausada</Badge>}
          </div>
          <button onClick={toggleStop} disabled={busy}
            className={clsx("inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold transition disabled:opacity-50",
              halted ? "bg-success/90 text-ink-950 hover:bg-success" : "bg-red-600 text-white hover:bg-red-500")}>
            {halted ? <><Play className="h-3.5 w-3.5" /> RETOMAR</> : <><OctagonX className="h-3.5 w-3.5" /> STOP ALL</>}
          </button>
        </header>
        <main className="grid-bg flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />}
    </div>
  );
}
