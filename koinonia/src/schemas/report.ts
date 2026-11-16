import { z } from "zod";
import { cleanText, reportReasonValues, reportTargetValues, uuidSchema } from "./common";

export const reportSchema = z.object({
  targetType: z.enum(reportTargetValues),
  targetId: uuidSchema,
  reason: z.enum(reportReasonValues),
  details: cleanText(2000),
});
