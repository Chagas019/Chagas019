import { z } from "zod";
import { isCountryCode, isLanguageCode } from "@/lib/geo";

export const availabilityValues = ["weekdays", "weekends", "evenings", "flexible"] as const;
export const visibilityValues = ["public", "members", "private"] as const;
export const messagePermissionValues = ["everyone", "verified_communities", "nobody"] as const;
export const communityKindValues = ["parish", "community", "movement", "diocese", "religious_order", "other"] as const;
export const opportunityModeValues = ["onsite", "remote", "hybrid"] as const;
export const reportReasonValues = ["spam", "abuse", "fraud", "inappropriate", "impersonation", "other"] as const;
export const reportTargetValues = ["profile", "community", "opportunity", "message", "resource", "review"] as const;

export const countrySchema = z.string().trim().toUpperCase().refine(isCountryCode, "validation.country");
export const optionalCountrySchema = z
  .string()
  .trim()
  .toUpperCase()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || isCountryCode(v), "validation.country");
export const languagesSchema = z.array(z.string().refine(isLanguageCode)).max(10);
export const httpsUrlSchema = z
  .string()
  .trim()
  .max(500, "validation.tooLong")
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || /^https:\/\/[^\s]+$/.test(v), "validation.url");
export const uuidSchema = z.string().uuid();

/** Normaliza texto livre: remove caracteres de controle (exceto quebras de linha) e espaços nas pontas. */
export const cleanText = (max: number, min = 0) =>
  z
    .string()
    .transform((v) => v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim())
    .pipe(z.string().min(min, "validation.tooShort").max(max, "validation.tooLong"));

/** Converte FormData em objeto, agrupando campos repetidos (checkbox múltiplo) em arrays. */
export function formToObject(form: FormData, arrayKeys: readonly string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    const values = form.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrayKeys.includes(key) ? values : values[0];
  }
  for (const key of arrayKeys) if (!(key in out)) out[key] = [];
  return out;
}
