"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "../auth";
import { requireViewer } from "../session";
import * as profiles from "../services/profiles";
import { updateNotificationPrefs } from "../services/notifications";
import { markAllRead } from "../services/notifications";
import { deleteAccount } from "../services/privacy";
import { notificationPrefsSchema } from "@/lib/validation";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { run } from "./run";

export async function completeOnboardingAction(input: unknown) {
  return run(async () => {
    const viewer = await requireViewer();
    await profiles.completeOnboarding(viewer.id, input);
  });
}

export async function updateProfileAction(input: unknown) {
  return run(async () => {
    const viewer = await requireViewer();
    const data = await profiles.updateProfile(viewer.id, input);
    revalidatePath(`/u/${viewer.handle}`);
    revalidatePath(`/u/${data.handle}`);
    return { handle: data.handle };
  }, "Perfil atualizado.");
}

export async function setProfileImageAction(which: "avatar" | "cover", mediaId: string) {
  return run(async () => {
    const viewer = await requireViewer();
    await profiles.setProfileImage(viewer.id, which, mediaId);
    revalidatePath(`/u/${viewer.handle}`);
  }, which === "avatar" ? "Foto atualizada." : "Capa atualizada.");
}

export async function updateNotificationPrefsAction(input: unknown) {
  return run(async () => {
    const parsed = notificationPrefsSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION");
    await updateNotificationPrefs((await requireViewer()).id, parsed.data);
  }, "Preferências salvas.");
}

export async function markNotificationsReadAction() {
  return run(async () => {
    await markAllRead((await requireViewer()).id);
    revalidatePath("/notificacoes");
  });
}

/** Exclusão definitiva: exige a senha atual e a frase de confirmação. */
export async function deleteAccountAction(input: { password: string; confirmation: string }) {
  return run(async () => {
    const viewer = await requireViewer();
    await enforceRateLimit(`delete-account:${viewer.id}`, 5, 900);
    if (input.confirmation.trim().toUpperCase() !== "EXCLUIR") throw new AppError("VALIDATION", "Digite EXCLUIR para confirmar.");
    const ok = await auth.api
      .verifyPassword({ body: { password: input.password }, headers: await headers() })
      .then(() => true)
      .catch(() => false);
    if (!ok) throw new AppError("FORBIDDEN", "Senha incorreta.");
    await deleteAccount(viewer.id);
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
  });
}

/** Depois de confirmar o e-mail pelo link, a pessoa cria a própria senha. */
export async function createPasswordAction(password: string, confirm: string) {
  return run(async () => {
    const viewer = await requireViewer();
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
      throw new AppError("VALIDATION", "Use uma senha de 8 a 128 caracteres.", { password: "Use uma senha de 8 a 128 caracteres." });
    }
    if (password !== confirm) throw new AppError("VALIDATION", "As senhas não são iguais.", { confirm: "As senhas não são iguais." });
    if (await profiles.hasPassword(viewer.id)) throw new AppError("VALIDATION", "Sua conta já tem senha. Para trocar, use Configurações.");
    await enforceRateLimit(`set-password:${viewer.id}`, 10, 3600);
    await auth.api.setPassword({ body: { newPassword: password }, headers: await headers() });
  }, "Senha criada. Bem-vinda(o) à FRAME!");
}
