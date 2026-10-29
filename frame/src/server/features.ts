import "server-only";
import { aiConfig } from "./services/ai";

/** O que está ativo neste ambiente — a interface só mostra o que funciona de verdade. */
export function features() {
  return {
    ai: aiConfig().enabled,
    mail: Boolean(process.env.RESEND_API_KEY),
    contactEmail: process.env.FRAME_CONTACT_EMAIL?.trim() || null,
  };
}
