"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "../session";
import * as collab from "../services/collab";
import { run } from "./run";

export async function createListingAction(input: unknown) {
  return run(async () => {
    const r = await collab.createListing(await requireViewer(), input);
    revalidatePath("/collab");
    return { id: r.id, code: r.access === "private" ? r.accessCode : null };
  }, "Oportunidade publicada.");
}

export async function applyAction(input: { listingId: string; message: string; portfolioUrl?: string }, code?: string) {
  return run(async () => {
    await collab.applyToListing(await requireViewer(), input, code);
    revalidatePath(`/collab/${input.listingId}`);
  }, "Interesse enviado! Você será avisado quando houver resposta.");
}

export async function decideApplicationAction(applicationId: string, decision: "accepted" | "declined") {
  return run(async () => {
    const r = await collab.decideApplication(await requireViewer(), applicationId, decision);
    revalidatePath(`/collab/${r.listingId}`);
  }, decision === "accepted" ? "Candidatura aceita. A pessoa agora vê seu contato." : "Candidatura recusada.");
}

export async function setListingStatusAction(id: string, status: "open" | "closed") {
  return run(async () => {
    await collab.setListingStatus(await requireViewer(), id, status);
    revalidatePath(`/collab/${id}`);
    revalidatePath("/collab");
  }, status === "closed" ? "Oportunidade encerrada." : "Oportunidade reaberta.");
}

export async function deleteListingAction(id: string) {
  return run(async () => {
    await collab.deleteListing(await requireViewer(), id);
    revalidatePath("/collab");
  }, "Oportunidade excluída.");
}
