import { requireViewerPage } from "@/server/session";
import { getProfileByUserId } from "@/server/services/profiles";
import { db } from "@/server/db";
import { block, mute, profile } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ProfileForm } from "@/components/settings/profile-form";
import { ImagesForm } from "@/components/settings/images-form";
import { DataControls, NotificationPrefsForm, PasswordForm } from "@/components/settings/account-forms";
import { UnblockList } from "@/components/settings/unblock-list";
import { FollowersList } from "@/components/settings/followers-list";
import { listFollowers } from "@/server/services/social";
import { Container, SectionTitle } from "@/components/ui/misc";

export const metadata = { title: "Configurações", robots: { index: false } };

export default async function Page() {
  const viewer = await requireViewerPage("/configuracoes");
  const p = (await getProfileByUserId(viewer.id))!;
  const [blocked, muted, followers] = await Promise.all([
    db.select({ userId: block.blockedId, handle: profile.handle }).from(block).innerJoin(profile, eq(profile.userId, block.blockedId)).where(eq(block.blockerId, viewer.id)),
    db.select({ userId: mute.mutedId, handle: profile.handle }).from(mute).innerJoin(profile, eq(profile.userId, mute.mutedId)).where(eq(mute.muterId, viewer.id)),
    listFollowers(viewer.id),
  ]);
  return (
    <Container className="max-w-3xl space-y-16 py-10">
      <SectionTitle eyebrow="Conta" title="Configurações" />
      <ImagesForm name={p.displayName} avatar={p.avatarMediaId} cover={p.coverMediaId} ownerId={viewer.id} />
      <ProfileForm profile={p} />
      <div id="notificacoes"><NotificationPrefsForm initial={p.notificationPrefs} /></div>
      <section id="seguidores" className="space-y-4">
        <h2 className="font-display text-3xl">Seguidores</h2>
        <FollowersList followers={followers} />
      </section>
      <section className="space-y-4">
        <h2 className="font-display text-3xl">Bloqueados e silenciados</h2>
        <UnblockList blocked={blocked} muted={muted} />
      </section>
      <section className="space-y-8">
        <h2 className="font-display text-3xl">Segurança e dados</h2>
        <p className="text-sm text-fog-500">E-mail da conta: {viewer.email}</p>
        <PasswordForm />
        <DataControls />
      </section>
    </Container>
  );
}
