"use server";

import { revalidatePath } from "next/cache";
import { requireViewer } from "../session";
import * as moderation from "../services/moderation";
import { run } from "./run";

export async function resolveReportAction(reportId: string, action: "remove" | "dismiss", note = "") {
  return run(async () => {
    await moderation.resolveReport(await requireViewer(), reportId, action, note);
    revalidatePath("/moderacao");
  }, action === "remove" ? "Conteúdo removido e denúncia resolvida." : "Denúncia arquivada.");
}

export async function restoreContentAction(targetType: "post" | "comment", targetId: string) {
  return run(async () => {
    await moderation.restoreContent(await requireViewer(), targetType, targetId);
    revalidatePath("/moderacao");
  }, "Conteúdo restaurado.");
}
