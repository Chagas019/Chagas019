import { z } from "zod";
import { availabilityValues, cleanText, languagesSchema, opportunityModeValues, optionalCountrySchema } from "./common";

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .refine((v) => v === null || !Number.isNaN(Date.parse(v)), "validation.required");

export const opportunitySchema = z
  .object({
    title: cleanText(140, 5),
    description: cleanText(5000, 20),
    mode: z.enum(opportunityModeValues),
    country: optionalCountrySchema,
    city: cleanText(80),
    languages: languagesSchema,
    availability: z.array(z.enum(availabilityValues)).max(4),
    skills: z.array(z.coerce.number().int().positive()).max(15),
    slots: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 10000), "validation.slots"),
    startsAt: optionalDate,
    endsAt: optionalDate,
    publish: z.enum(["open", "draft"]),
  })
  .refine((d) => d.mode === "remote" || d.country !== null, { path: ["country"], message: "validation.country" })
  .refine((d) => !d.startsAt || !d.endsAt || d.endsAt >= d.startsAt, { path: ["endsAt"], message: "validation.dates" });

export const applicationSchema = z.object({ message: cleanText(2000) });
