"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Compass, Home, Swords, User } from "lucide-react";
import { CreateMenu } from "./create-menu";
import { isActivePath } from "./nav-items";
import { cn } from "@/lib/utils";

/** Barra inferior do celular em pílula: Início, Explorar, Criar (botão branco central), Desafios, Perfil. */
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
        <Link href={it.href} aria-current={active ? "page" : undefined} aria-label={it.label} className="flex min-h-16 flex-col items-center justify-center gap-1">
          <it.icon className={cn("size-[22px] transition-colors", active ? "text-paper" : "text-fog-500")} strokeWidth={2.2} aria-hidden />
          {active ? <motion.span layoutId="bar-active" transition={{ type: "spring", stiffness: 500, damping: 38 }} className="h-1 w-1 rounded-full bg-volt-500" aria-hidden /> : <span className="h-1 w-1" aria-hidden />}
          <span className="sr-only">{it.label}</span>
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label="Navegação rápida" className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+10px)] z-[var(--z-nav)] rounded-[30px] bg-[#1b1c1a]/95 shadow-[0_20px_50px_-12px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl lg:hidden">
      <ul className="grid grid-cols-5 items-center px-1">
        {left.map(item)}
        <li className="flex justify-center">
          <CreateMenu signedIn={!!handle} isModerator={isModerator} variant="bar" />
        </li>
        {right.map(item)}
      </ul>
    </nav>
  );
}
