import { z } from "zod";
import {
  availabilityValues, cleanText, httpsUrlSchema, languagesSchema, messagePermissionValues, optionalCountrySchema, visibilityValues,
} from "./common";

const hoursSchema = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : Number(v)))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= 80), "validation.required");

export const onboardingSchema = z.object({
  displayName: cleanText(80, 2),
  bio: cleanText(1000),
  country: optionalCountrySchema,
  city: cleanText(80),
  languages: languagesSchema.min(1, "validation.languagesMin"),
  availability: z.array(z.enum(availabilityValues)).max(4),
  hoursPerWeek: hoursSchema,
  visibility: z.enum(visibilityValues),
  messagePermission: z.enum(messagePermissionValues),
});

export const profileSchema = onboardingSchema.extend({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .transform((v) => (v === "" ? null : v))
    .refine((v) => v === null || /^[a-z0-9_]{3,30}$/.test(v), "validation.username"),
  phone: cleanText(30),
  contactEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine((v) => v === "" || z.string().email().safeParse(v).success, "validation.email"),
});

export const profileSkillsSchema = z.object({
  skills: z.array(z.coerce.number().int().positive()).max(30),
});

export const portfolioSchema = z.object({
  title: cleanText(120, 2),
  description: cleanText(1000),
  url: httpsUrlSchema,
});
