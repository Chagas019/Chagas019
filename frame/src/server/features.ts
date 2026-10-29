import "server-only";
import { mailProvider } from "./mail";
import { aiConfig } from "./services/ai";

/** O que está ativo neste ambiente — a interface só mostra o que funciona de verdade. */
export function features() {
  return {
    ai: aiConfig().enabled,
    mail: mailProvider() !== null,
    contactEmail: process.env.FRAME_CONTACT_EMAIL?.trim() || null,
  };
}
