"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "../session";
import * as social from "../services/social";
import { run } from "./run";

export async function toggleLikeAction(postId: string) {
  return run(async () => social.toggleLike(await requireViewer(), postId));
}

export async function toggleSaveAction(postId: string, collectionId: string | null = null) {
  return run(async () => {
    const r = await social.toggleSave(await requireViewer(), postId, collectionId);
    revalidatePath("/salvos");
    return r;
  });
}

export async function addCommentAction(input: { postId: string; parentId?: string | null; body: string }) {
  return run(async () => {
    const c = await social.addComment(await requireViewer(), input);
    revalidatePath(`/p/${input.postId}`);
    return { id: c.id };
  }, "Comentário publicado.");
}

export async function deleteCommentAction(commentId: string, postId: string) {
  return run(async () => {
    await social.deleteComment(await requireViewer(), commentId);
    revalidatePath(`/p/${postId}`);
  }, "Comentário removido.");
}

export async function setFollowAction(targetId: string, follow: boolean) {
  return run(async () => social.setFollow(await requireViewer(), targetId, follow));
}

export async function setBlockAction(targetId: string, block: boolean) {
  return run(async () => {
    await social.setBlock(await requireViewer(), targetId, block);
    revalidatePath("/");
  }, block ? "Perfil bloqueado. Vocês não verão mais o conteúdo um do outro." : "Desbloqueado.");
}

export async function setMuteAction(targetId: string, mute: boolean) {
  return run(async () => social.setMute(await requireViewer(), targetId, mute), mute ? "Perfil silenciado no seu feed." : "Silenciamento removido.");
}

export async function reportAction(input: { targetType: "post" | "comment" | "user" | "community"; targetId: string; reason: string; details: string }) {
  return run(async () => {
    await social.createReport(await requireViewer(), input);
  }, "Denúncia enviada. A moderação vai analisar — obrigado por cuidar da comunidade.");
}

export async function createCollectionAction(input: { name: string; description?: string; isPublic?: boolean }) {
  return run(async () => {
    const c = await social.createCollection(await requireViewer(), input);
    revalidatePath("/salvos");
    return { id: c.id, name: c.name };
  }, "Coleção criada.");
}

export async function deleteCollectionAction(id: string) {
  return run(async () => {
    await social.deleteCollection(await requireViewer(), id);
    revalidatePath("/salvos");
  }, "Coleção excluída.");
}

export async function rateTutorialAction(postId: string, helpful: boolean) {
  return run(async () => {
    await social.rateTutorial(await requireViewer(), postId, helpful);
    revalidatePath(`/p/${postId}`);
  }, "Obrigado pela avaliação!");
}
