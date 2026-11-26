import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/actions/auth";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { NavLinks } from "./nav-links";
import { Search, User } from "lucide-react";

export const NAV = [
  { href: "/presets", label: "Presets" },
  { href: "/estilos", label: "Style Explorer" },
  { href: "/inspiracao", label: "Inspiration" },
  { href: "/premium", label: "Premium Club" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAdmin = user?.profile.role === "admin";
  const name = user?.profile.display_name || user?.email.split("@")[0];
  return (
    <header className="sticky top-0 z-50 border-b hairline bg-ink/85 backdrop-blur-xl">
      <div className="container-lab flex h-16 items-center justify-between gap-6 md:h-[72px]">
        <Logo />
        <nav aria-label="Principal" className="hidden lg:block">
          <NavLinks items={NAV} />
        </nav>
        <div className="flex items-center gap-1 md:gap-2">
          <Link href="/presets#busca" aria-label="Buscar presets" className="grid size-10 place-items-center rounded-full text-bone/80 transition hover:bg-bone/10 hover:text-bone">
            <Search className="size-[18px]" />
          </Link>
          {user ? (
            <div className="hidden items-center gap-2 lg:flex">
              {isAdmin && (
                <Link href="/admin" className="lab-label rounded-full border border-signal/50 px-3 py-2 text-signal transition hover:bg-signal hover:text-signal-ink">
                  Admin Studio
                </Link>
              )}
              <Link href="/lab" className="flex items-center gap-2 rounded-full bg-bone/8 py-1.5 pl-1.5 pr-4 text-sm transition hover:bg-bone/15">
                <span className="grid size-7 place-items-center rounded-full bg-signal font-mono text-xs font-medium uppercase text-signal-ink">{name?.slice(0, 1)}</span>
                My Lab
              </Link>
              <form action={signOutAction}>
                <button className="lab-label px-3 py-2 text-smoke transition hover:text-bone">Sair</button>
              </form>
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link href="/entrar" className="px-3 py-2 text-sm text-bone/80 transition hover:text-bone">
                Entrar
              </Link>
              <Link href="/cadastro" className="rounded-full bg-bone px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-white">
                Criar conta
              </Link>
            </div>
          )}
          {user && (
            <Link href="/lab" aria-label="My Lab" className="grid size-10 place-items-center rounded-full text-bone/80 hover:bg-bone/10 lg:hidden">
              <User className="size-[18px]" />
            </Link>
          )}
          <MobileNav items={NAV} loggedIn={!!user} isAdmin={isAdmin} signOut={signOutAction} />
        </div>
      </div>
    </header>
  );
}
