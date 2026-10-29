import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireViewerPage } from "@/server/session";
import { getConversation, markConversationRead } from "@/server/services/messages";
import { Thread } from "@/components/messages/thread";
import { Container } from "@/components/ui/misc";

export const metadata = { title: "Conversa", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewerPage(`/mensagens/${id}`);
  const data = await getConversation(viewer, id);
  if (!data) notFound();
  await markConversationRead(viewer.id, id);
  const others = data.members.filter((m) => m.userId !== viewer.id);
  const title = data.conversation.isGroup ? (data.conversation.title ?? others.map((o) => o.displayName.split(" ")[0]).join(", ")) : (others[0]?.displayName ?? "Conversa");
  return (
    <Container className="max-w-3xl space-y-4 py-6">
      <div className="flex items-center gap-3">
        <Link href="/mensagens" className="grid size-10 place-items-center rounded-full text-fog-300 hover:bg-white/5" aria-label="Voltar para mensagens">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl">{title}</h1>
          <p className="truncate text-xs text-fog-500">
            {others.map((o, i) => (
              <span key={o.userId}>
                {i ? ", " : ""}
                <Link href={`/u/${o.handle}`} className="hover:text-paper">
                  @{o.handle}
                </Link>
              </span>
            ))}
          </p>
        </div>
      </div>
      <Thread conversationId={id} viewerId={viewer.id} members={data.members} initial={data.messages} blocked={data.blocked} />
    </Container>
  );
}
