import { Compass, FlaskConical, Home, Palette, Sparkles, Swords, Users, Briefcase, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; auth?: boolean };

/** Itens da navegação principal (desktop) — os mesmos destinos do restante do site. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/descobrir", label: "Explorar", icon: Compass },
  { href: "/lab", label: "LAB", icon: FlaskConical },
  { href: "/desafios", label: "Desafios", icon: Swords },
  { href: "/comunidades", label: "Comunidades", icon: Users },
  { href: "/collab", label: "Collab", icon: Briefcase },
  { href: "/estudio-criativo", label: "Studio", icon: Sparkles },
  { href: "/estudio", label: "Meu estúdio", icon: Palette, auth: true },
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
