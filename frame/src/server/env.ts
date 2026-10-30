import "server-only";
import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL é obrigatória"),
  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET precisa de 32+ caracteres"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  STORAGE_DRIVER: z.enum(["local", "blob"]).default("local"),
  LOCAL_STORAGE_DIR: z.string().default("./storage"),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  FRAME_AI_MODEL: z.string().default("anthropic/claude-haiku-5-5"),
  AI_GATEWAY_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  FRAME_AI_DAILY_LIMIT: z.coerce.number().int().positive().default(30),
  FRAME_AI_GLOBAL_DAILY_BUDGET_USD: z.coerce.number().positive().default(5),
  CHALLENGE_MIN_ACCOUNT_AGE_HOURS: z.coerce.number().min(0).default(24),
  FRAME_ADMIN_EMAILS: z.string().default(""),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      throw new Error(`Configuração inválida: ${issues}`);
    }
    if (parsed.data.STORAGE_DRIVER === "blob" && !parsed.data.BLOB_READ_WRITE_TOKEN) {
      throw new Error("STORAGE_DRIVER=blob exige BLOB_READ_WRITE_TOKEN");
    }
    cached = parsed.data;
  }
  return cached;
}
