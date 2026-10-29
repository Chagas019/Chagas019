"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, Home, Swords, User } from "lucide-react";
import { CreateMenu } from "./create-menu";
import { isActivePath } from "./nav-items";
import { cn } from "@/lib/utils";

/** Barra inferior do celular: Início, Explorar, Criar (central), Desafios, Perfil. */
export function BottomBar({ handle, isModerator }: { handle: string | null; isModerator: boolean }) {
  const pathname = usePathname();
  const left = [
    { href: "/", label: "Início", icon: Home },
    { href: "/descobrir", label: "Explorar", icon: Compass },
  ];
  const right = [
    { href: "/desafios", label: "Desafios", icon: Swords },
    handle ? { href: `/u/${handle}`, label: "Perfil", icon: User } : { href: "/entrar", label: "Entrar", icon: User },
  ];
  const item = (it: (typeof left)[number]) => {
    const active = isActivePath(pathname, it.href);
    return (
      <li key={it.href} className="relative">
        <Link href={it.href} aria-current={active ? "page" : undefined} className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px]">
          {active ? <motion.span layoutId="bar-active" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="absolute top-1 h-1 w-6 rounded-full bg-volt-500" aria-hidden /> : null}
          <it.icon className={cn("size-[22px]", active ? "text-paper" : "text-fog-500")} aria-hidden />
          <span className={active ? "text-paper" : "text-fog-500"}>{it.label}</span>
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Navegação rápida" className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+8px)] z-[var(--z-nav)] rounded-[24px] bg-ink-900/90 ring-1 ring-white/[0.08] backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5 items-center">
        {left.map(item)}
        <li className="flex justify-center">
          <CreateMenu signedIn={!!handle} isModerator={isModerator} variant="bar" />
        </li>
        {right.map(item)}
      </ul>
    </nav>
  );
}
