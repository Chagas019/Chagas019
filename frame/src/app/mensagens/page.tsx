import Link from "next/link";
import { MessageSquare, Plus } from "lucide-react";
import { requireViewerPage } from "@/server/session";
import { listConversations } from "@/server/services/messages";
import { ButtonLink } from "@/components/ui/button";
import { Avatar, Container, EmptyState, SectionTitle } from "@/components/ui/misc";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Mensagens", robots: { index: false } };

export default async function Page() {
  const viewer = await requireViewerPage("/mensagens");
  const convos = await listConversations(viewer.id);
  return (
    <Container className="max-w-2xl space-y-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionTitle eyebrow="Conversas" title="Mensagens" />
        <ButtonLink href="/mensagens/nova">
          <Plus className="size-4" aria-hidden /> Nova mensagem
        </ButtonLink>
      </div>
      {convos.length ? (
        <ul className="divide-y divide-ink-700">
          {convos.map((c) => {
            const name = c.isGroup ? (c.title ?? c.others.map((o) => o.displayName.split(" ")[0]).join(", ")) : (c.others[0]?.displayName ?? "Conversa");
            return (
              <li key={c.id}>
                <Link href={`/mensagens/${c.id}`} className="flex items-center gap-3 py-4 hover:bg-white/[0.02]">
                  <Avatar mediaId={c.others[0]?.avatar ?? null} name={name} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate ${c.unread ? "font-semibold text-paper" : "text-fog-200"}`}>{name}</span>
                      <span className="shrink-0 text-xs text-fog-500">{timeAgo(c.lastMessageAt)}</span>
                    </span>
                    <span className={`block truncate text-sm ${c.unread ? "text-fog-200" : "text-fog-500"}`}>{c.preview}</span>
                  </span>
                  {c.unread ? <span className="grid min-w-5 place-items-center rounded-full bg-volt-500 px-1.5 text-[11px] font-semibold text-white">{c.unread}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState icon={<MessageSquare className="size-6" />} title="Nenhuma conversa ainda" action={<ButtonLink href="/mensagens/nova">Escrever para alguém</ButtonLink>}>
          Converse com quem você segue e com parceiros de colaborações aceitas.
        </EmptyState>
      )}
    </Container>
  );
}
