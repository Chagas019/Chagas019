"use server";

import { revalidatePath } from "next/cache";
import { getViewer, requireViewer } from "../session";
import * as posts from "../services/posts";
import { notifyCommunityPost } from "../services/posts";
import type { FeedFilter } from "@/lib/taxonomy";
import { FEED_FILTERS } from "@/lib/taxonomy";
import { linkProjectPost } from "../services/studio";
import { run } from "./run";

export async function createPostAction(input: unknown, files: { mediaIds: string[]; beforeMediaId?: string | null }) {
  return run(async () => {
    const viewer = await requireViewer();
    const created = await posts.createPost(viewer, input, files);
    // Publicação feita a partir de um projeto do estúdio: liga os dois (só se o projeto for da pessoa).
    const projectId = (input as { projectId?: unknown })?.projectId;
    if (typeof projectId === "string") await linkProjectPost(viewer.id, projectId, created.id).catch(() => {});
    const communityId = (input as { communityId?: string | null })?.communityId;
    if (communityId) await notifyCommunityPost(communityId, viewer.id, created.id);
    revalidatePath("/");
    revalidatePath(`/u/${viewer.handle}`);
    return created;
  });
}

export async function deletePostAction(postId: string) {
  return run(async () => {
    const viewer = await requireViewer();
    await posts.deletePost(viewer, postId);
    revalidatePath("/");
    revalidatePath(`/u/${viewer.handle}`);
  }, "Publicação excluída.");
}

export async function updateVisibilityAction(postId: string, visibility: "public" | "followers" | "private") {
  return run(async () => {
    await posts.updatePostVisibility(await requireViewer(), postId, visibility);
    revalidatePath(`/p/${postId}`);
  }, "Visibilidade atualizada.");
}

export async function loadFeedAction(filter: string, cursor: string | null) {
  return run(async () => {
    const f = (FEED_FILTERS.some((x) => x.slug === filter) ? filter : "para-voce") as FeedFilter;
    return posts.getFeed(await getViewer(), f, cursor);
  });
}

export async function updatePostAction(postId: string, input: unknown) {
  return run(async () => {
    const viewer = await requireViewer();
    const r = await posts.updatePost(viewer, postId, input);
    revalidatePath(`/p/${postId}`);
    revalidatePath("/");
    revalidatePath(`/u/${viewer.handle}`);
    return r;
  }, "Alterações salvas.");
}

export async function setPinnedAction(postId: string, pinned: boolean) {
  return run(async () => {
    const viewer = await requireViewer();
    const r = await posts.setPinned(viewer, postId, pinned);
    revalidatePath(`/u/${viewer.handle}`);
    revalidatePath(`/p/${postId}`);
    return r;
  }, pinned ? "Fixado no seu portfólio." : "Removido do portfólio.");
}
