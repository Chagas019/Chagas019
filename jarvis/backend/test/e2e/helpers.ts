import { SignJWT } from "jose";
import type { FastifyInstance } from "fastify";
import { createOrchestrator, createToolRegistry } from "../../src/ai/index.js";
import type { Repos, ToolRegistry, Tool } from "../../src/core/types.js";
import { buildApp } from "../../src/server/app.js";
import { loadConfig } from "../../src/server/config.js";
import { createMemoryRepos } from "../../src/server/repos/memory.js";

export const JWT_SECRET = "e2e-secret-e2e-secret-e2e-secret-1234";
export const DEV = "e2e-dev-token";
export const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
export const USER_A = "11111111-1111-4111-8111-111111111111";
export const USER_B = "22222222-2222-4222-8222-222222222222";

export type GatewayHandler = (body: any, n: number) => Response | Promise<Response>;

/** Gateway fake (OpenAI-compat). Qualquer URL fora do gateway falha o teste: nenhuma chamada externa real. */
export function fakeGateway(handler: GatewayHandler) {
  const requests: any[] = [];
  const fetchImpl = (async (url: unknown, init?: RequestInit) => {
    if (String(url) !== GATEWAY_URL) throw new Error(`chamada externa inesperada: ${String(url)}`);
    const body = JSON.parse(String(init?.body));
    requests.push(body);
    return handler(body, requests.length);
  }) as typeof fetch;
  return { fetchImpl, requests };
}

export function completion(opts: { text?: string; tools?: { name: string; args?: unknown; id?: string }[]; promptTokens?: number; completionTokens?: number } = {}): Response {
  const tool_calls = (opts.tools ?? []).map((t, i) => ({ id: t.id ?? `call_${i}`, type: "function", function: { name: t.name, arguments: JSON.stringify(t.args ?? {}) } }));
  return new Response(JSON.stringify({
    choices: [{ finish_reason: tool_calls.length ? "tool_calls" : "stop", message: { role: "assistant", content: opts.text ?? null, ...(tool_calls.length ? { tool_calls } : {}) } }],
    usage: { prompt_tokens: opts.promptTokens ?? 1000, completion_tokens: opts.completionTokens ?? 100 },
  }), { status: 200, headers: { "content-type": "application/json" } });
}

export const httpError = (status: number, body = "falha simulada") => new Response(body, { status });
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sequência de respostas: i-ésima chamada usa script[i]; esgotado => texto "fim". */
export const seq = (...rs: (() => Response)[]): GatewayHandler => (_b, n) => (rs[n - 1] ?? (() => completion({ text: "fim" })))();

export interface Stack { app: FastifyInstance; repos: Repos; tools: ToolRegistry; requests: any[]; env: Record<string, string> }

export async function makeStack(o: { env?: Record<string, string>; handler?: GatewayHandler; tools?: Tool[] } = {}): Promise<Stack> {
  const env: Record<string, string> = {
    NODE_ENV: "test", SUPABASE_JWT_SECRET: JWT_SECRET, JARVIS_DEV_TOKEN: DEV,
    AI_GATEWAY_API_KEY: "test", RATE_LIMIT_PER_MIN: "1000", ...o.env,
  };
  const gw = fakeGateway(o.handler ?? (() => completion({ text: "ok" })));
  const config = loadConfig(env);
  const repos = createMemoryRepos();
  const tools = createToolRegistry();
  for (const t of o.tools ?? []) tools.register(t);
  const orchestrator = createOrchestrator({ repos, tools, env, fetchImpl: gw.fetchImpl });
  const app = await buildApp({ config, repos, orchestrator, dbKind: "memory" });
  return { app, repos, tools, requests: gw.requests, env };
}

export async function jwt(sub: string, o: { aud?: string; exp?: string | number | null; secret?: string; iss?: string; alg?: "HS256" | "HS384" } = {}) {
  const b = new SignJWT({ email: `${sub}@x.com` }).setProtectedHeader({ alg: o.alg ?? "HS256" }).setSubject(sub).setAudience(o.aud ?? "authenticated").setIssuedAt();
  if (o.iss) b.setIssuer(o.iss);
  if (o.exp !== null) b.setExpirationTime(o.exp ?? "1h");
  return b.sign(new TextEncoder().encode(o.secret ?? JWT_SECRET));
}

export const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
export const bearer = (t: string) => ({ authorization: `Bearer ${t}` });

export async function call(app: FastifyInstance, token: string, method: "GET" | "POST" | "PATCH" | "DELETE", url: string, payload?: unknown) {
  const r = await app.inject({ method, url, headers: bearer(token), ...(payload !== undefined ? { payload: payload as object } : {}) });
  return { status: r.statusCode, body: r.body ? JSON.parse(r.body) : undefined, headers: r.headers, raw: r.body };
}

export const chat = (s: Stack, token: string, payload: Record<string, unknown>) => call(s.app, token, "POST", "/v1/chat", payload);

/** Ferramenta com efeito externo, só para testes (contador de execuções). */
export function sideEffectTool(delayMs = 0) {
  const runs: unknown[] = [];
  const tool: Tool = {
    name: "send_email", description: "Envia e-mail (teste).", sideEffect: true,
    inputSchema: { type: "object", properties: { to: { type: "string" } }, required: ["to"] },
    async run(input) { if (delayMs) await sleep(delayMs); runs.push(input); return { ok: true, output: "enviado" }; },
  };
  return { tool, runs };
}
