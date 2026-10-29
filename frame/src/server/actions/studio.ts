"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "../session";
import * as studio from "../services/studio";
import { run } from "./run";

export async function createProjectAction(input: unknown) {
  return run(async () => {
    const v = await requireViewer();
    const p = await studio.createProject(v.id, input);
    revalidatePath("/estudio");
    return p;
  }, "Projeto criado no seu estúdio.");
}

export async function updateProjectAction(id: string, input: unknown) {
  return run(async () => {
    const v = await requireViewer();
    await studio.updateProject(v.id, id, input);
    revalidatePath("/estudio");
    revalidatePath(`/estudio/projetos/${id}`);
  }, "Projeto salvo.");
}

export async function deleteProjectAction(id: string) {
  return run(async () => {
    const v = await requireViewer();
    await studio.deleteProject(v.id, id);
    revalidatePath("/estudio");
  }, "Projeto apagado.");
}

export async function saveIdeaAction(proposal: unknown) {
  return run(async () => {
    const v = await requireViewer();
    const i = await studio.saveIdea(v.id, proposal);
    revalidatePath("/estudio");
    return i;
  }, "Ideia salva no seu estúdio.");
}

export async function deleteIdeaAction(id: string) {
  return run(async () => {
    const v = await requireViewer();
    await studio.deleteIdea(v.id, id);
    revalidatePath("/estudio");
  }, "Ideia apagada.");
}

export async function projectFromIdeaAction(ideaId: string) {
  return run(async () => {
    const v = await requireViewer();
    const p = await studio.projectFromIdea(v.id, ideaId);
    revalidatePath("/estudio");
    return p;
  }, "Ideia virou projeto.");
}

export async function toggleSavedExampleAction(slug: string) {
  return run(async () => {
    const v = await requireViewer();
    const r = await studio.toggleSavedExample(v.id, slug);
    revalidatePath("/estudio");
    return r;
  });
}
