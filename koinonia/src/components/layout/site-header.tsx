import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { getSession } from "@/features/auth/session";
import { logoutAction } from "@/features/auth/actions";
import { Avatar, Button, ButtonLink } from "@/components/ui";
import { Logo } from "./logo";
import { NavLinks, type NavItem } from "./nav-links";
import { MobileMenu } from "./mobile-menu";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/i18n/format";

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
  if (session) {
    const unread = await unreadCount();
    items.push(
      { href: "/recursos", label: m.nav.resources },
      { href: "/match", label: m.nav.match },
      { href: "/mensagens", label: m.nav.messages, badge: unread, badgeLabel: t(m.messages.unread, { count: unread }) },
      { href: "/painel", label: m.nav.dashboard },
    );
    if (session.isModerator) items.push({ href: "/admin", label: m.nav.admin });
  }
  const name = session?.profile?.display_name || session?.email || "";

  const accountActions = session ? (
    <>
      <ButtonLink href="/perfil" variant="ghost" size="sm" className="justify-start lg:justify-center">
        <Avatar name={name} src={session.profile?.avatar_url} size="sm" className="size-7 text-[0.65rem]" />
        {m.nav.profile}
      </ButtonLink>
      <ButtonLink href="/conta" variant="ghost" size="sm" className="justify-start lg:justify-center">{m.nav.account}</ButtonLink>
      <form action={logoutAction}>
        <Button type="submit" variant="outline" size="sm" className="w-full lg:w-auto">{m.nav.logout}</Button>
      </form>
    </>
  ) : (
    <>
      <ButtonLink href="/entrar" variant="ghost" size="sm">{m.nav.login}</ButtonLink>
      <ButtonLink href="/cadastro" variant="primary" size="sm">{m.nav.signup}</ButtonLink>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-canvas/85 backdrop-blur-md supports-[backdrop-filter]:bg-canvas/75">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 rounded-lg" aria-label={`${m.brand.name} — ${m.brand.slogan}`}>
          <Logo />
        </Link>
        <nav aria-label={m.nav.main} className="hidden lg:block">
          <NavLinks items={items} className="flex items-center gap-1" />
        </nav>
        <div className="hidden items-center gap-2 lg:flex">{accountActions}</div>
        <MobileMenu items={items} openLabel={m.nav.openMenu} closeLabel={m.nav.closeMenu} footer={accountActions} />
      </div>
    </header>
  );
}
