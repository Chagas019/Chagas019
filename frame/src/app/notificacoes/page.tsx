import Link from "next/link";
import { Bell } from "lucide-react";
import { requireViewerPage } from "@/server/session";
import { listNotifications } from "@/server/services/notifications";
import { MarkReadOnView } from "@/components/social/mark-read";
import { Avatar, Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Notificações", robots: { index: false } };

export default async function Page() {
  const viewer = await requireViewerPage("/notificacoes");
  const items = await listNotifications(viewer.id);
  const hasUnread = items.some((n) => !n.readAt);
  return (
    <Container className="max-w-2xl space-y-8 py-10">
      <div className="flex items-end justify-between">
        <SectionTitle eyebrow="Atividade" title="Notificações" />
        <Link href="/configuracoes#notificacoes" className="text-sm text-fog-400 hover:text-paper">
          Preferências
        </Link>
      </div>
      {hasUnread ? <MarkReadOnView /> : null}
      {items.length ? (
        <ul className="divide-y divide-ink-700">
          {items.map((n) => {
            const href = n.postId ? `/p/${n.postId}` : n.type === "follow" && n.message.includes("aprove") ? "/configuracoes#seguidores" : n.actorHandle && n.type === "follow" ? `/u/${n.actorHandle}` : n.challengeId ? "/desafios" : n.communityId ? "/comunidades" : "#";
            return (
              <li key={n.id}>
                <Link href={href} className="flex items-start gap-3 py-4 hover:bg-white/[0.02]">
                  {n.actorName ? <Avatar mediaId={n.actorAvatar} name={n.actorName} size={36} /> : <span className="grid size-9 place-items-center rounded-full bg-volt-500/15 text-volt-300"><Bell className="size-4" aria-hidden /></span>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fog-200">
                      {n.actorName ? <span className="font-medium text-paper">{n.actorName} </span> : null}
                      {n.message}
                      {n.postTitle ? <span className="text-fog-400"> · “{n.postTitle}”</span> : null}
                    </p>
                    <p className="mt-0.5 text-xs text-fog-500">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.readAt ? <span className="mt-2 size-2 shrink-0 rounded-full bg-volt-400" aria-label="não lida" /> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<Bell className="size-6" />} title="Tudo em silêncio">Quando alguém seguir você, comentar ou responder, aparece aqui.</EmptyState>
      )}
    </Container>
  );
}
