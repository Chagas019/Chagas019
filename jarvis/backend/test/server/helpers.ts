import { SignJWT } from "jose";
import { BudgetExceededError, type Orchestrator, type OrchestratorInput, type OrchestratorResult } from "../../src/core/types.js";
import { buildApp } from "../../src/server/app.js";
import { loadConfig } from "../../src/server/config.js";
import { createMemoryRepos } from "../../src/server/repos/memory.js";

export const JWT_SECRET = "test-secret-test-secret-test-secret-123";
export const DEV = "dev-token-abc";

export function fakeOrchestrator(over: Partial<Orchestrator> = {}): Orchestrator & { calls: OrchestratorInput[] } {
  const calls: OrchestratorInput[] = [];
  return {
    calls,
    providers: () => [{ id: "fake", models: ["m"] }],
    async handle(input): Promise<OrchestratorResult> {
      calls.push(input);
      return { reply: `eco: ${input.message}`, provider: "fake", model: "m", toolCalls: [], usage: { inputTokens: 1, outputTokens: 2, costUsd: 0.001 } };
    },
    ...over,
  };
}

export async function makeApp(env: Record<string, string> = {}, orch: Orchestrator = fakeOrchestrator()) {
  const config = loadConfig({ NODE_ENV: "test", JARVIS_DEV_TOKEN: DEV, SUPABASE_JWT_SECRET: JWT_SECRET, ...env });
  const repos = createMemoryRepos();
  const app = await buildApp({ config, repos, orchestrator: orch });
  return { app, repos, config };
}

export const bearer = (t = DEV) => ({ authorization: `Bearer ${t}` });

export async function jwt(sub: string, o: { aud?: string; exp?: string | number; secret?: string } = {}) {
  return new SignJWT({ email: `${sub}@x.com` })
    .setProtectedHeader({ alg: "HS256" }).setSubject(sub).setAudience(o.aud ?? "authenticated")
    .setIssuedAt().setExpirationTime(o.exp ?? "1h").sign(new TextEncoder().encode(o.secret ?? JWT_SECRET));
}
export { BudgetExceededError };
