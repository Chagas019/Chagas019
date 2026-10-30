import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins/magic-link";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import * as schema from "./db/schema";
import { accessLinkEmail, sendMail } from "./mail";
import { createProfileForUser } from "./services/profiles";

const adminEmails = (process.env.FRAME_ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const auth = betterAuth({
  appName: "FRAME",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 30,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Redefinir sua senha no FRAME",
        text: `Olá, ${user.name}.\n\nPara criar uma nova senha, acesse: ${url}\n\nO link expira em 30 minutos. Se não foi você, ignore esta mensagem.`,
      });
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", required: false, input: false, defaultValue: "user" },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.FRAME_DISABLE_AUTH_RATE_LIMIT !== "1" && process.env.NODE_ENV === "production",
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 8 },
      "/sign-up/email": { window: 300, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/sign-in/magic-link": { window: 300, max: 5 },
    },
  },
  telemetry: { enabled: false },
  databaseHooks: {
    user: {
      create: {
        before: async (u) => ({
          data: { ...u, role: adminEmails.includes(u.email.toLowerCase()) ? "admin" : "user" },
        }),
        after: async (u) => {
          await createProfileForUser({ id: u.id, name: u.name, email: u.email });
        },
      },
    },
  },
  plugins: [
    // Login sem senha: a pessoa recebe um link de acesso no e-mail. Se ainda não tem conta, ela é criada no clique.
    magicLink({
      expiresIn: 60 * 15,
      storeToken: "hashed",
      sendMagicLink: async ({ email, url }) => {
        const [existing] = await db.select({ id: schema.user.id }).from(schema.user).where(eq(sql`lower(${schema.user.email})`, email.toLowerCase())).limit(1);
        const m = accessLinkEmail(url, !existing);
        await sendMail({ to: email, ...m });
      },
    }),
    nextCookies(),
  ],
});
