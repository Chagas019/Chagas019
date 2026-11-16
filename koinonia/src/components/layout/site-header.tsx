import Link from "next/link";
import { Bell, LayoutDashboard, LogOut, MessageCircle, Settings, Shield, User } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { t } from "@/i18n/format";
import { getSession } from "@/features/auth/session";
import { logoutAction } from "@/features/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { Avatar, ButtonLink } from "@/components/ui";
import { Dropdown, dropdownItemClass } from "@/components/ui/dropdown";
import { Logo } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { MobileMenu } from "./mobile-menu";

async function unreadCount(): Promise<number> {
  const supabase = await createClient();
  if (!supabase) return 0;
  const { data } = await supabase.rpc("unread_message_count");
  return typeof data === "number" ? data : 0;
}

export async function SiteHeader() {
  const [{ m }, session] = await Promise.all([getI18n(), getSession()]);
  const items: NavItem[] = [
    { href: "/oportunidades", label: m.nav.opportunities },
    { href: "/talentos", label: m.nav.talents },
    { href: "/comunidades", label: m.nav.communities },
  ];
  const unread = session ? await unreadCount() : 0;
  if (session) items.push({ href: "/recursos", label: m.nav.resources }, { href: "/match", label: m.nav.match });
  const name = session?.profile?.display_name || session?.email || "";

  const accountLinks = session
    ? [
        { href: "/painel", label: m.nav.dashboard, Icon: LayoutDashboard },
        { href: "/mensagens", label: unread ? `${m.nav.messages} (${unread})` : m.nav.messages, Icon: MessageCircle },
        { href: "/perfil", label: m.nav.profile, Icon: User },
        { href: "/conta", label: m.nav.account, Icon: Settings },
        ...(session.isModerator ? [{ href: "/admin", label: m.nav.admin, Icon: Shield }] : []),
      ]
    : [];

  const logout = (
    <form action={logoutAction}>
      <button type="submit" className={dropdownItemClass}><LogOut aria-hidden className="size-4" />{m.nav.logout}</button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-neon-400/10 bg-night-900/70 backdrop-blur-xl supports-[backdrop-filter]:bg-night-900/55">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 rounded-lg" aria-label={`${m.brand.name} — ${m.brand.slogan}`}>
          <Logo />
        </Link>
        <nav aria-label={m.nav.main} className="hidden lg:block">
          <NavLinks items={items} className="flex items-center gap-1" />
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {session ? (
            <>
              <Link href="/mensagens" className="relative inline-flex size-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-white/5 hover:text-white">
                <Bell aria-hidden className="size-5" />
                <span className="sr-only">{m.nav.messages}{unread ? `: ${t(m.messages.unread, { count: unread })}` : ""}</span>
                {unread ? <span aria-hidden className="absolute top-1.5 right-1.5 inline-flex min-w-4 animate-rise items-center justify-center rounded-full bg-neon-400 px-1 text-[0.65rem] font-bold text-night-950">{unread}</span> : null}
              </Link>
              <Dropdown label={m.common.accountMenu} buttonContent={<><Avatar name={name} src={session.profile?.avatar_url} size="sm" className="size-7 text-[0.65rem]" /><span className="max-w-32 truncate">{name}</span></>}>
                {accountLinks.map(({ href, label, Icon }) => (
                  <Link key={href} href={href} className={dropdownItemClass}><Icon aria-hidden className="size-4 text-neon-400" />{label}</Link>
                ))}
                <div className="my-1 h-px bg-border" />
                {logout}
              </Dropdown>
            </>
          ) : (
            <>
              <ButtonLink href="/entrar" variant="ghost" size="sm">{m.nav.login}</ButtonLink>
              <ButtonLink href="/cadastro" variant="primary" size="sm">{m.nav.signup}</ButtonLink>
            </>
          )}
        </div>
        <MobileMenu
          items={[...items, ...accountLinks.map(({ href, label }) => ({ href, label }))]}
          openLabel={m.nav.openMenu}
          closeLabel={m.nav.closeMenu}
          footer={session ? logout : (
            <>
              <ButtonLink href="/entrar" variant="outline" size="sm">{m.nav.login}</ButtonLink>
              <ButtonLink href="/cadastro" variant="primary" size="sm">{m.nav.signup}</ButtonLink>
            </>
          )}
        />
      </div>
    </header>
  );
}
