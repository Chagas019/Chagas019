import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(254);
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(128, "Senha muito longa.")
  .regex(/[A-Za-z]/, "Use pelo menos uma letra.")
  .regex(/[0-9]/, "Use pelo menos um número.");

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Como podemos te chamar?").max(80),
  email: emailSchema,
  password: passwordSchema,
});
export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Informe a senha.").max(128) });
export const resetRequestSchema = z.object({ email: emailSchema });
export const newPasswordSchema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });
export const profileSchema = z.object({
  displayName: z.string().trim().min(2, "Mínimo de 2 caracteres.").max(80),
  bio: z.string().trim().max(500, "Máximo de 500 caracteres."),
});
export const uuidSchema = z.string().uuid();

/** Primeira mensagem de erro por campo. */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    out[k] ??= i.message;
  }
  return out;
}
