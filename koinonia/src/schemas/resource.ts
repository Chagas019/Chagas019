import { z } from "zod";
import { cleanText, countrySchema } from "./common";

export const resourceKindValues = ["camera", "lens", "microphone", "equipment", "event_structure", "space", "material", "other"] as const;

export const resourceSchema = z.object({
  title: cleanText(120, 3),
  description: cleanText(3000),
  kind: z.enum(resourceKindValues),
  country: countrySchema,
  city: cleanText(80, 1),
  shipsRemotely: z.string().optional().transform((v) => v === "on"),
});

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "validation.required");

export const resourceRequestSchema = z
  .object({
    message: cleanText(2000, 10),
    startsOn: isoDate,
    endsOn: isoDate,
    requesterCommunity: z.string().transform((v) => (v === "" ? null : v)).pipe(z.string().uuid().nullable()),
  })
  .refine((d) => d.endsOn >= d.startsOn, { path: ["endsOn"], message: "validation.dates" });
