"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "../session";
import * as communities from "../services/communities";
import { run } from "./run";

export async function createCommunityAction(input: unknown) {
  return run(async () => {
    const c = await communities.createCommunity(await requireViewer(), input);
    revalidatePath("/comunidades");
    return { slug: c.slug };
  }, "Comunidade criada.");
}

export async function joinCommunityAction(communityId: string, slug: string, inviteCode?: string) {
  return run(async () => {
    const r = await communities.joinCommunity(await requireViewer(), communityId, inviteCode);
    revalidatePath(`/comunidades/${slug}`);
    return r;
  });
}

export async function leaveCommunityAction(communityId: string, slug: string) {
  return run(async () => {
    await communities.leaveCommunity(await requireViewer(), communityId);
    revalidatePath(`/comunidades/${slug}`);
  }, "Você saiu da comunidade.");
}

export async function moderateMemberAction(communityId: string, slug: string, userId: string, action: "approve" | "reject" | "ban" | "promote" | "demote") {
  return run(async () => {
    await communities.moderateMember(await requireViewer(), communityId, userId, action);
    revalidatePath(`/comunidades/${slug}`);
  }, "Membro atualizado.");
}

export async function removeCommunityPostAction(communityId: string, slug: string, postId: string) {
  return run(async () => {
    await communities.removeCommunityPost(await requireViewer(), communityId, postId);
    revalidatePath(`/comunidades/${slug}`);
  }, "Publicação removida da comunidade.");
}

export async function regenerateInviteAction(communityId: string, slug: string) {
  return run(async () => {
    const code = await communities.regenerateInvite(await requireViewer(), communityId);
    revalidatePath(`/comunidades/${slug}`);
    return { code };
  }, "Novo link de convite gerado. O anterior deixou de funcionar.");
}

export async function setCommunityNotifyAction(communityId: string, slug: string, notify: boolean) {
  return run(async () => {
    await communities.setCommunityNotify(await requireViewer(), communityId, notify);
    revalidatePath(`/comunidades/${slug}`);
  }, notify ? "Notificações ativadas." : "Notificações desativadas.");
}
