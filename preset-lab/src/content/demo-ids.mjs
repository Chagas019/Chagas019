import { createHash } from "node:crypto";
/** UUID determinístico para registros de demonstração (mesmos IDs no modo local e no Supabase). */
export function demoId(kind, slug) {
  const h = createHash("sha1").update(`presetlab:${kind}:${slug}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
