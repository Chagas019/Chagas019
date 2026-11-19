import { resolveIntegration, markVerification } from "../../integrations/store";
import { WhatsAppCloudClient, WhatsAppApiError } from "../../integrations/whatsapp/cloudApi";
import { TelegramBotClient } from "../../integrations/telegram/bot";
import { errMsg } from "../../lib/core";

export type ChannelName = "whatsapp_cloud" | "telegram" | "manual" | "dry_run";

export interface SendResult {
  externalId: string | null;
}

export class ChannelError extends Error {
  constructor(message: string, public readonly kind: "send_error" | "connection_lost" | "permission_denied") {
    super(message);
  }
}

export interface ChannelReadiness {
  ready: boolean;
  reasons: string[];
  target: string | null;
}

/** Um canal só está pronto se: configurado + verificado (conectividade/permissão) + consentimento confirmado. */
export async function channelReadiness(channel: ChannelName): Promise<ChannelReadiness> {
  if (channel === "manual" || channel === "dry_run") return { ready: true, reasons: [], target: null };
  const provider = channel === "whatsapp_cloud" ? "WHATSAPP_CLOUD" : "TELEGRAM_BOT";
  const r = await resolveIntegration(provider);
  const reasons: string[] = [];
  if (!r.configured) reasons.push(`credenciais/config ausentes: ${r.missing.join(", ")}`);
  if (r.row?.status !== "VERIFIED") reasons.push("integração não verificada (rode a verificação no painel)");
  if (!r.row?.consentConfirmed) reasons.push("consentimento dos participantes não confirmado");
  return { ready: reasons.length === 0, reasons, target: channel === "whatsapp_cloud" ? r.config.groupId ?? null : r.config.chatId ?? null };
}

export async function sendToChannel(channel: ChannelName, message: string): Promise<SendResult> {
  if (channel === "dry_run") return { externalId: `dry-run-${Date.now()}` };
  if (channel === "manual") throw new Error("canal manual não envia automaticamente");

  if (channel === "whatsapp_cloud") {
    const r = await resolveIntegration("WHATSAPP_CLOUD");
    const c = new WhatsAppCloudClient(r.creds.token, r.config.phoneNumberId, r.config.graphVersion);
    try {
      const res = await c.sendGroupText(r.config.groupId, message);
      return { externalId: res.messageId };
    } catch (err) {
      if (err instanceof WhatsAppApiError) {
        if (err.isPermission) {
          await markVerification("WHATSAPP_CLOUD", false, { at: new Date().toISOString() }, err.message);
          throw new ChannelError(err.message, "permission_denied");
        }
        throw new ChannelError(err.message, err.status === 0 ? "connection_lost" : "send_error");
      }
      throw new ChannelError(errMsg(err), "send_error");
    }
  }

  const r = await resolveIntegration("TELEGRAM_BOT");
  const t = new TelegramBotClient(r.creds.botToken);
  try {
    return { externalId: (await t.sendMessage(r.config.chatId, message)).messageId };
  } catch (err) {
    const status = (err as { status?: number }).status ?? -1;
    throw new ChannelError(errMsg(err), status === 0 ? "connection_lost" : status === 403 ? "permission_denied" : "send_error");
  }
}

/** Verificação real de conectividade e permissões de cada canal. */
export async function verifyChannel(channel: "whatsapp_cloud" | "telegram") {
  if (channel === "whatsapp_cloud") {
    const r = await resolveIntegration("WHATSAPP_CLOUD");
    if (!r.configured) return { ok: false, error: `faltando: ${r.missing.join(", ")}`, details: {} };
    const c = new WhatsAppCloudClient(r.creds.token, r.config.phoneNumberId, r.config.graphVersion);
    const details: Record<string, unknown> = {};
    try {
      details.phone = await c.phoneInfo();
      details.group = await c.groupInfo(r.config.groupId);
      await markVerification("WHATSAPP_CLOUD", true, details);
      return { ok: true, details };
    } catch (err) {
      const msg = errMsg(err);
      await markVerification("WHATSAPP_CLOUD", false, details, msg);
      return { ok: false, error: msg, details };
    }
  }
  const r = await resolveIntegration("TELEGRAM_BOT");
  if (!r.configured) return { ok: false, error: `faltando: ${r.missing.join(", ")}`, details: {} };
  const t = new TelegramBotClient(r.creds.botToken);
  const details: Record<string, unknown> = {};
  try {
    const me = await t.getMe();
    details.bot = me;
    details.chat = await t.getChat(r.config.chatId);
    const member = await t.getMyStatus(r.config.chatId, me.id);
    details.member = member;
    const canPost = member.status === "administrator" || member.status === "creator";
    if (!canPost) throw new Error(`bot não é administrador do chat (status: ${member.status})`);
    await markVerification("TELEGRAM_BOT", true, details);
    return { ok: true, details };
  } catch (err) {
    const msg = errMsg(err);
    await markVerification("TELEGRAM_BOT", false, details, msg);
    return { ok: false, error: msg, details };
  }
}
