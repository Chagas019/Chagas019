"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, LOCALE_COOKIE } from "./config";
import { safeRedirectPath } from "@/lib/utils";

export async function setLocaleAction(form: FormData): Promise<void> {
  const locale = form.get("locale");
  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", httpOnly: true });
  }
  redirect(safeRedirectPath(form.get("returnTo"), "/"));
}
