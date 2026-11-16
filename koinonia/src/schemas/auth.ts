import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().max(254).email("validation.email");
export const passwordSchema = z.string().min(10, "validation.passwordMin").max(128, "validation.tooLong");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "validation.required").max(128),
});

export const signupSchema = z
  .object({
    displayName: z.string().trim().min(2, "validation.nameMin").max(80, "validation.tooLong"),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal("on", { message: "validation.acceptTerms" }),
    acceptPrivacy: z.literal("on", { message: "validation.acceptPrivacy" }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "validation.passwordMatch" });

export const forgotSchema = z.object({ email: emailSchema });

export const resetSchema = z
  .object({ password: passwordSchema, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ["confirmPassword"], message: "validation.passwordMatch" });
