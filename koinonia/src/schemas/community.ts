import { z } from "zod";
import { cleanText, communityKindValues, countrySchema, httpsUrlSchema, languagesSchema } from "./common";

export const communitySchema = z.object({
  name: cleanText(120, 3),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]{3,60}$/, "communities.slugHint"),
  kind: z.enum(communityKindValues),
  description: cleanText(3000),
  country: countrySchema,
  city: cleanText(80, 1),
  diocese: cleanText(120),
  website: httpsUrlSchema,
  languages: languagesSchema,
  needs: cleanText(2000),
  focusCategories: z.array(z.coerce.number().int().positive()).max(10),
});

export const verificationSchema = z.object({
  evidence: cleanText(3000, 20),
});
