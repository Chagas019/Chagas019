import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { t } from "@/i18n/format";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { listMyConversations } from "@/services/messaging";
import { attempt } from "@/lib/attempt";
import { Avatar, Badge, StatePanel } from "@/components/ui";
import { Container, PageHeader } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";
import { AutoRefresh } from "@/components/features/auto-refresh";
import { formatDate } from "@/lib/geo";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.messages.title, robots: { index: false } };
}

export default async function MessagesPage() {
  const { m, locale } = await getI18n();
  await requireSession("/mensagens");
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const res = await attempt(() => listMyConversations(supabase));

  let body: React.ReactNode;
  if (!res.ok) body = <StatePanel variant="error" title={m.states.errorTitle}><p>{m.states.errorBody}</p></StatePanel>;
  else if (res.data.length === 0) body = <StatePanel variant="empty" title={m.states.emptyTitle}><p>{m.messages.empty}</p></StatePanel>;
  else body = (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {res.data.map((c) => (
        <li key={c.conversation_id}>
          <Link href={`/mensagens/${c.conversation_id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-white/5">
            <Avatar name={c.other_name || "?"} src={c.other_avatar} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-3">
                <span className={`truncate ${c.unread ? "font-bold" : "font-semibold"}`}>{c.other_name || "—"}</span>
                <span className="shrink-0 text-xs text-ink-subtle">{formatDate(c.last_at, locale)}</span>
              </span>
              <span className="mt-0.5 flex items-center justify-between gap-3">
                <span className="truncate text-sm text-ink-muted">{c.last_body ?? ""}</span>
                {c.unread ? <Badge tone="gold">{t(m.messages.unread, { count: c.unread })}</Badge> : null}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <Container size="md" className="py-12">
      <AutoRefresh intervalMs={30000} />
      <PageHeader title={m.messages.title} subtitle={m.messages.subtitle} />
      {body}
    </Container>
  );
}
