import Link from "next/link";
import { Bell, MessageSquare, Plus } from "lucide-react";
import { getViewer, isModerator } from "@/server/session";
import { unreadCount } from "@/server/services/notifications";
import { unreadConversations } from "@/server/services/messages";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";
import { features } from "@/server/features";
import { NavLinks, MobileNav } from "./nav";
import { UserMenu } from "./user-menu";

export async function Header() {
  const viewer = await getViewer();
  const [unread, unreadDm] = viewer ? await Promise.all([unreadCount(viewer.id), unreadConversations(viewer.id)]) : [0, 0];
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-ink-950/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-10">
          <Logo />
          <NavLinks aiEnabled={features().ai} />
          <div className="ml-auto flex items-center gap-2">
            {viewer ? (
              <>
                <ButtonLink href="/publicar" size="sm" className="hidden sm:inline-flex">
                  <Plus className="size-4" aria-hidden /> Publicar
                </ButtonLink>
                <Link
                  href="/mensagens"
                  className="relative grid size-10 place-items-center rounded-full text-fog-300 transition-colors hover:bg-white/5 hover:text-paper"
                  aria-label={unreadDm ? `Mensagens (${unreadDm} conversas não lidas)` : "Mensagens"}
                >
                  <MessageSquare className="size-5" aria-hidden />
                  {unreadDm > 0 ? (
                    <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-volt-500 px-1 text-[10px] font-semibold leading-4 text-ink-950">
                      {unreadDm > 99 ? "99+" : unreadDm}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/notificacoes"
                  className="relative grid size-10 place-items-center rounded-full text-fog-300 transition-colors hover:bg-white/5 hover:text-paper"
                  aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"}
                >
                  <Bell className="size-5" aria-hidden />
                  {unread > 0 ? (
                    <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-volt-500 px-1 text-[10px] font-semibold leading-4 text-ink-950">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
                <UserMenu handle={viewer.handle} name={viewer.displayName} avatar={viewer.avatarMediaId} isModerator={isModerator(viewer)} aiEnabled={features().ai} />
              </>
            ) : (
              <>
                <ButtonLink href="/entrar" variant="ghost" size="sm">
                  Entrar
                </ButtonLink>
                <ButtonLink href="/cadastro" size="sm">
                  Criar conta
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>
      <MobileNav handle={viewer?.handle ?? null} />
    </>
  );
}
