import "server-only";
import { cookies, headers } from "next/headers";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";
import { messagesFor } from "./format";
import type { Locale } from "@/types/database";

export async function getLocale(): Promise<Locale> {
  const cookieValue = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) return cookieValue;
  const accept = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  if (accept.startsWith("es")) return "es";
  if (accept.startsWith("en")) return "en";
  return defaultLocale;
}

export async function getI18n() {
  const locale = await getLocale();
  return { locale, m: messagesFor(locale) };
}
