import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { requireSession } from "@/features/auth/session";
import { blockUserAction } from "@/features/messaging/actions";
import { AvatarForm, DeleteAccountForm } from "@/features/account/components/account-forms";
import { Avatar, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui";
import { buttonVariants } from "@/components/ui/button";
import { Container, PageHeader } from "@/components/layout/page-header";
import { BackendUnavailable } from "@/components/features/backend-unavailable";

export async function generateMetadata(): Promise<Metadata> {
  const { m } = await getI18n();
  return { title: m.account.title, robots: { index: false } };
}

export default async function AccountPage() {
  const { m } = await getI18n();
  const session = await requireSession("/conta", { onboarded: false });
  const supabase = await createClient();
  if (!supabase) return <Container className="py-16"><BackendUnavailable m={m} headingLevel={1} /></Container>;
  const { data: blocks } = await supabase.from("blocks").select("blocked_id, profile:profiles!blocks_blocked_id_fkey(display_name)").eq("blocker_id", session.userId);
  const blocked = (blocks ?? []) as unknown as Array<{ blocked_id: string; profile: { display_name: string } | null }>;
  const name = session.profile?.display_name || session.email || "";

  return (
    <Container size="md" className="py-12">
      <PageHeader title={m.account.title} actions={<Link href="/perfil" className={buttonVariants({ variant: "outline", size: "sm" })}>{m.profile.editTitle}</Link>} />
      <div className="flex flex-col gap-8">
        <Card>
          <CardHeader><CardTitle as="h2">{m.account.avatar}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <Avatar name={name} src={session.profile?.avatar_url} size="lg" />
            <div className="flex-1"><AvatarForm m={m} /></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle as="h2">{m.account.blockedUsers}</CardTitle></CardHeader>
          <CardContent>
            {blocked.length === 0 ? <p className="text-sm text-ink-muted">{m.account.noBlocked}</p> : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {blocked.map((b) => (
                  <li key={b.blocked_id} className="flex items-center justify-between gap-3 p-3">
                    <span>{b.profile?.display_name || "—"}</span>
                    <form action={blockUserAction}>
                      <input type="hidden" name="userId" value={b.blocked_id} /><input type="hidden" name="mode" value="unblock" /><input type="hidden" name="back" value="/conta" />
                      <Button type="submit" size="sm" variant="ghost">{m.messages.unblock}</Button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle as="h2">{m.account.exportTitle}</CardTitle><CardDescription>{m.account.exportBody}</CardDescription></CardHeader>
          <CardContent><a href="/conta/exportar" download className={buttonVariants({ variant: "outline", size: "sm" })}>{m.account.exportSubmit}</a></CardContent>
        </Card>
        <Card className="border-danger/40">
          <CardHeader><CardTitle as="h2" className="text-danger">{m.account.deleteTitle}</CardTitle><CardDescription>{m.account.deleteBody}</CardDescription></CardHeader>
          <CardContent><DeleteAccountForm m={m} /></CardContent>
        </Card>
      </div>
    </Container>
  );
}
