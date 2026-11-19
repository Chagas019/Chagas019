import { execSync } from "node:child_process";

/** Aplica as migrações no banco DEDICADO de testes e limpa os dados (nunca roda em outro banco). */
export default function () {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://oferta:oferta@localhost:5432/oferta_ai_test";
  if (!/_test(\?|$)/.test(url)) throw new Error("TEST_DATABASE_URL deve apontar para um banco cujo nome termina em _test");
  const env = { ...process.env, DATABASE_URL: url };
  execSync("npx prisma migrate deploy", { env, stdio: "ignore" });
  const tables = [
    "ClickLog", "PublicationLog", "Publication", "GeneratedCopy", "AffiliateLink", "ProductStateHistory", "ProductPrice",
    "ProductReview", "Product", "Campaign", "AgentExecution", "Agent", "DailyMetrics", "Integration", "Setting", "AuditLog", "SystemLog", "User", "KvStore",
  ].map((t) => `"${t}"`).join(", ");
  execSync(`npx prisma db execute --stdin --schema prisma/schema.prisma`, { env, input: `TRUNCATE ${tables} CASCADE;`, stdio: ["pipe", "ignore", "ignore"] });
}
