import { t } from "@/i18n/format";
import type { Messages } from "@/i18n/types";
import type { Notification } from "@/types/database";

/** Texto e link de uma notificação a partir do tipo e do payload (sempre tratados como dados). */
export function describeNotification(n: Notification, m: Messages): { text: string; href: string | null } {
  const dict = m.notifications as Record<string, string>;
  const template = dict[n.kind] ?? m.notifications.fallback;
  const p = n.payload;
  const str = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const uuid = /^[0-9a-f-]{36}$/i;
  const title = str("opportunity_title") || str("resource_title");
  let href: string | null = null;
  if (n.kind.startsWith("application.") && uuid.test(str("opportunity_id"))) href = `/oportunidades/${str("opportunity_id")}`;
  return { text: t(template, { title }), href };
}
