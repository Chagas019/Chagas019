"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Briefcase, MessageSquare, GraduationCap, LogOut, Settings, Shield, Sparkles, Swords, User, Users, FilePen } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ handle, name, avatar, isModerator, aiEnabled }: { handle: string; name: string; avatar: string | null; isModerator: boolean; aiEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { href: `/u/${handle}`, label: "Meu portfólio", icon: User },
    { href: "/salvos", label: "Salvos e coleções", icon: Bookmark },
    { href: "/rascunhos", label: "Rascunhos", icon: FilePen },
    { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
    { href: "/lab", label: "FRAME LAB", icon: GraduationCap, mobileOnly: true },
    { href: "/comunidades", label: "Comunidades", icon: Users, mobileOnly: true },
    { href: "/desafios", label: "Desafios", icon: Swords, mobileOnly: true },
    { href: "/collab", label: "Collab", icon: Briefcase, mobileOnly: true },
    ...(aiEnabled ? [{ href: "/ai", label: "FRAME AI", icon: Sparkles, mobileOnly: true }] : []),
    { href: "/configuracoes", label: "Configurações", icon: Settings },
    ...(isModerator ? [{ href: "/moderacao", label: "Moderação", icon: Shield }] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Abrir menu da conta"
        className="rounded-full ring-offset-2 ring-offset-ink-950 transition hover:ring-2 hover:ring-ink-600"
      >
        <Avatar mediaId={avatar} name={name} size={34} />
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 mt-2 w-60 animate-rise overflow-hidden rounded-[var(--radius-md)] bg-ink-850 p-1.5 shadow-[var(--shadow-pop)]">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-paper">{name}</p>
            <p className="truncate text-xs text-fog-500">@{handle}</p>
          </div>
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm text-fog-300 hover:bg-white/5 hover:text-paper ${"mobileOnly" in it && it.mobileOnly ? "lg:hidden" : ""}`}
            >
              <it.icon className="size-4" aria-hidden />
              {it.label}
            </Link>
          ))}
          <button
            role="menuitem"
            onClick={async () => {
              await authClient.signOut();
              router.push("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm text-fog-300 hover:bg-white/5 hover:text-paper"
          >
            <LogOut className="size-4" aria-hidden />
            Sair
          </button>
        </div>
      ) : null}
    </div>
  );
}
