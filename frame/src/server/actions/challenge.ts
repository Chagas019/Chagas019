"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "../session";
import * as challenges from "../services/challenges";
import { run } from "./run";

export async function submitToChallengeAction(input: { challengeId: string; postId: string; note?: string; slug: string }) {
  return run(async () => {
    await challenges.submitToChallenge(await requireViewer(), input);
    revalidatePath(`/desafios/${input.slug}`);
  }, "Trabalho enviado ao desafio. Boa sorte!");
}

export async function withdrawSubmissionAction(challengeId: string, slug: string) {
  return run(async () => {
    await challenges.withdrawSubmission(await requireViewer(), challengeId);
    revalidatePath(`/desafios/${slug}`);
  }, "Envio retirado.");
}

export async function toggleVoteAction(submissionId: string) {
  return run(async () => challenges.toggleVote(await requireViewer(), submissionId));
}

export async function createChallengeAction(input: unknown) {
  return run(async () => {
    const c = await challenges.createChallenge(await requireViewer(), input);
    revalidatePath("/desafios");
    return { slug: c.slug };
  }, "Desafio criado.");
}
