import Link from "next/link";
import { cookies } from "next/headers";
import { Bell, MessageSquare, Search } from "lucide-react";
import { canSeeStats, getViewer, isModerator } from "@/server/session";
import { unreadCount } from "@/server/services/notifications";
import { unreadConversations } from "@/server/services/messages";
import { projectProgress } from "@/server/services/studio";
import { activeCreators24h } from "@/server/services/stats";
import { features } from "@/server/features";
import { dailyPrompt } from "@/lib/creative/daily";
import { ButtonLink } from "@/components/ui/button";
import { Logo } from "./logo";
import { Sidebar } from "./sidebar";
import { BottomBar } from "./bottom-bar";
import { UserMenu } from "./user-menu";

function Badge({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-volt-500 px-1 text-[10px] font-semibold leading-4 text-ink-950">{n > 99 ? "99+" : n}</span>;
}

const iconBtn = "relative grid size-10 place-items-center rounded-full text-fog-300 transition-colors hover:bg-white/[0.06] hover:text-paper";

/** Shell: sidebar flutuante (desktop), barra superior flutuante e barra inferior (celular). */
export async function Header() {
  const viewer = await getViewer();
  const collapsed = (await cookies()).get("frame_nav")?.value === "collapsed";
  const [unread, unreadDm, progress, active] = await Promise.all([
    viewer ? unreadCount(viewer.id) : 0,
    viewer ? unreadConversations(viewer.id) : 0,
    viewer ? projectProgress(viewer.id) : null,
    activeCreators24h(),
  ]);
  const mod = isModerator(viewer);

  return (
    <>
      <Sidebar signedIn={!!viewer} isModerator={mod} initialCollapsed={collapsed} daily={{ title: dailyPrompt().title }} progress={progress} />
      <div className="shell-main sticky top-0 z-[var(--z-nav)] px-2 pt-[calc(env(safe-area-inset-top)+8px)] sm:px-3">
        <header className="mx-auto flex h-14 max-w-[1440px] items-center gap-2 rounded-[22px] bg-ink-900/80 pl-4 pr-2 ring-1 ring-white/[0.07] backdrop-blur-xl">
          <span className="lg:hidden">
            <Logo />
          </span>
          {active > 0 ? (
            <Link href="/descobrir?ordem=recentes" className="ml-1 hidden items-center gap-2 rounded-full px-2 py-1 text-xs text-fog-400 hover:text-paper sm:flex lg:ml-0" title="Pessoas que publicaram nas últimas 24 horas">
              <span className="live-dot size-2 rounded-full bg-volt-500" aria-hidden />
              {active} {active === 1 ? "criador ativo" : "criadores ativos"} hoje
            </Link>
          ) : null}
          <div className="ml-auto flex items-center gap-0.5">
            <Link href="/descobrir#busca" className={iconBtn} aria-label="Pesquisar">
              <Search className="size-5" aria-hidden />
            </Link>
            {viewer ? (
              <>
                <Link href="/mensagens" className={iconBtn} aria-label={unreadDm ? `Mensagens (${unreadDm} não lidas)` : "Mensagens"}>
                  <MessageSquare className="size-5" aria-hidden />
                  <Badge n={unreadDm} />
                </Link>
                <Link href="/notificacoes" className={iconBtn} aria-label={unread ? `Notificações (${unread} não lidas)` : "Notificações"}>
                  <Bell className="size-5" aria-hidden />
                  <Badge n={unread} />
                </Link>
                <span className="ml-1">
                  <UserMenu handle={viewer.handle} name={viewer.displayName} avatar={viewer.avatarMediaId} isModerator={mod} aiEnabled={features().ai} canSeeStats={canSeeStats(viewer)} />
                </span>
              </>
            ) : (
              <>
                <ButtonLink href="/entrar" variant="ghost" size="sm">
                  Entrar
                </ButtonLink>
                <ButtonLink href="/cadastro" size="sm" className="rounded-full">
                  Criar conta
                </ButtonLink>
              </>
            )}
          </div>
        </header>
      </div>
      <BottomBar handle={viewer?.handle ?? null} isModerator={mod} />
    </>
  );
}
