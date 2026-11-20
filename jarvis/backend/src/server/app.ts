import Fastify, { type FastifyInstance, type FastifyPluginAsync, type FastifyReply, type FastifyRequest } from "fastify";
import { z, ZodError } from "zod";
import { BudgetExceededError, ProvidersFailedError, type Orchestrator, type Repos } from "../core/types.js";
import { createAuthenticator, type AuthUser } from "./auth.js";
import type { Config } from "./config.js";
import { AppError, ProviderUnavailableError, badRequest, notFound } from "./errors.js";

export const API_VERSION = "0.1.0";

declare module "fastify" {
  interface FastifyInstance {
    repos: Repos;
    config: Config;
    /**
     * preHandler reutilizável para plugins (ex.: integrações):
     *   app.get("/v1/x", { preHandler: app.requireAuth }, async (req) => req.user.userId)
     * Valida o Bearer, aplica rate limit por usuário e preenche `req.user`.
     */
    requireAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: AuthUser;
  }
}

export interface BuildAppOptions {
  config: Config;
  repos: Repos;
  orchestrator: Orchestrator;
  /** Plugins extras (ex.: rotas /v1/integrations/**). Têm acesso a app.repos, app.config e app.requireAuth. */
  plugins?: FastifyPluginAsync[];
  dbKind?: "memory" | "postgres";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const limitQ = z.coerce.number().int().min(1).max(200).optional();

const ChatBody = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1).max(4000),
  mode: z.enum(["auto", "fast", "deep"]).optional(),
  confirm: z.boolean().optional(),
}).strict();
const MemoryBody = z.object({ kind: z.enum(["fact", "preference", "summary"]), content: z.string().trim().min(1).max(2000) }).strict();
const TaskCreate = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().max(2000).optional(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
}).strict();
const TaskPatch = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  notes: z.string().max(2000).optional(),
  dueAt: z.iso.datetime({ offset: true }).optional(),
  status: z.enum(["open", "done"]).optional(),
}).strict();
const DeviceBody = z.object({ apnsToken: z.string().min(8).max(300) }).strict();

function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw badRequest(r.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`).join("; "));
  return r.data;
}

export async function buildApp(opts: BuildAppOptions): Promise<FastifyInstance> {
  const { config, repos, orchestrator } = opts;
  const app = Fastify({
    bodyLimit: 32 * 1024,
    logger: config.nodeEnv === "test" ? false : { level: "info", redact: ["req.headers.authorization", "req.headers.cookie"] },
  });

  app.decorate("repos", repos);
  app.decorate("config", config);
  app.decorateRequest("user", null as unknown as AuthUser);

  // --- Headers de segurança + CORS ---
  app.addHook("onRequest", async (req, reply) => {
    const origin = req.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
      reply.header("Access-Control-Allow-Headers", "Authorization, Content-Type");
      reply.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
      if (req.method === "OPTIONS") return reply.code(204).send();
    }
  });
  app.addHook("onSend", async (_req, reply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("Cache-Control", "no-store");
    reply.header("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  });

  // --- Erros no formato do contrato ---
  app.setErrorHandler((err: Error & { statusCode?: number; code?: string }, req, reply) => {
    let status = 500;
    let code: string = "internal";
    let message = "Erro interno.";
    if (err instanceof AppError) { status = err.status; code = err.code; message = err.message; }
    else if (err instanceof BudgetExceededError) { status = 429; code = "budget_exceeded"; message = err.message; }
    else if (err instanceof ProvidersFailedError) { status = 502; code = "provider_unavailable"; message = "Provedores de IA indisponíveis no momento."; req.log.warn({ causes: err.causes }, "providers failed"); }
    else if (err instanceof ZodError) { status = 400; code = "bad_request"; message = "Requisição inválida."; }
    else if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) {
      status = err.statusCode === 413 ? 400 : err.statusCode;
      code = status === 404 ? "not_found" : "bad_request";
      message = err.statusCode === 413 ? "Corpo excede 32KB." : "Requisição inválida.";
    }
    if (status >= 500) req.log.error({ err: { message: err.message, name: err.name } }, "erro não tratado");
    return reply.code(status).send({ error: { code, message } });
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: { code: "not_found", message: "Rota não encontrada." } }));

  // --- Auth + rate limit (token bucket em memória por userId) ---
  const authenticate = createAuthenticator(config);
  const buckets = new Map<string, { tokens: number; ts: number }>();
  const cap = config.rateLimitPerMin;
  function takeToken(userId: string): number {
    const t = Date.now();
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (t - b.ts > 120_000) buckets.delete(k);
    const b = buckets.get(userId) ?? { tokens: cap, ts: t };
    b.tokens = Math.min(cap, b.tokens + ((t - b.ts) * cap) / 60_000);
    b.ts = t;
    if (b.tokens < 1) { buckets.set(userId, b); return Math.ceil(((1 - b.tokens) * 60_000) / cap / 1000); }
    b.tokens -= 1;
    buckets.set(userId, b);
    return 0;
  }
  app.decorate("requireAuth", async (req: FastifyRequest, reply: FastifyReply) => {
    const user = await authenticate(req.headers.authorization);
    if (!user) throw new AppError(401, "unauthorized", "Token ausente ou inválido.");
    const wait = takeToken(user.userId);
    if (wait > 0) {
      reply.header("Retry-After", String(wait));
      throw new AppError(429, "rate_limited", "Muitas requisições. Tente novamente em instantes.");
    }
    req.user = user;
  });
  const auth = { preHandler: app.requireAuth };
  const uid = (req: FastifyRequest) => req.user.userId;
  const checkId = (id: string, what: string) => { if (!UUID.test(id)) throw notFound(what); };

  // --- Rotas ---
  app.get("/health", async () => ({
    ok: true,
    version: API_VERSION,
    providers: orchestrator.providers().map((p) => p.id),
    db: opts.dbKind ?? (config.databaseUrl ? "postgres" : "memory"),
  }));

  app.get("/v1/me", auth, async (req) => ({ userId: uid(req), ...(req.user.email ? { email: req.user.email } : {}) }));

  app.post("/v1/chat", auth, async (req) => {
    const body = parse(ChatBody, req.body);
    const userId = uid(req);
    let conversationId: string;
    if (body.conversationId !== undefined) {
      checkId(body.conversationId, "Conversa");
      const c = await repos.conversations.get(userId, body.conversationId);
      if (!c) throw notFound("Conversa");
      conversationId = c.id;
    } else {
      conversationId = (await repos.conversations.create(userId, body.message.trim().slice(0, 60) || "Nova conversa")).id;
    }
    const history = await repos.messages.list(conversationId, 20);
    const { pendingAction, ...result } = await orchestrator.handle({
      userId, conversationId, history, message: body.message, mode: body.mode ?? "auto", confirm: body.confirm ?? false,
    });
    if (result.provider === "none") throw new ProviderUnavailableError();

    await repos.messages.add({ conversationId, role: "user", content: body.message });
    await repos.messages.add({
      conversationId, role: "assistant", content: result.reply,
      meta: {
        provider: result.provider, model: result.model, toolCalls: result.toolCalls, usage: result.usage,
        ...(result.pendingConfirmation ? { pendingConfirmation: result.pendingConfirmation } : {}),
        ...(pendingAction ? { pending: pendingAction } : {}), // interno: nunca enviado ao cliente
      },
    });
    await repos.conversations.touch(conversationId);
    return { conversationId, ...result };
  });

  app.get("/v1/conversations", auth, async (req) => {
    const { limit } = parse(z.object({ limit: limitQ }), req.query);
    return { items: await repos.conversations.list(uid(req), limit ?? 50) };
  });

  app.get<{ Params: { id: string } }>("/v1/conversations/:id/messages", auth, async (req) => {
    const { limit } = parse(z.object({ limit: limitQ }), req.query);
    checkId(req.params.id, "Conversa");
    if (!(await repos.conversations.get(uid(req), req.params.id))) throw notFound("Conversa");
    return { items: await repos.messages.list(req.params.id, limit ?? 100) };
  });

  app.get("/v1/memories", auth, async (req) => {
    const { q, limit } = parse(z.object({ q: z.string().max(200).optional(), limit: limitQ }), req.query);
    const items = q?.trim() ? await repos.memories.search(uid(req), q.trim(), limit ?? 50) : await repos.memories.list(uid(req), limit ?? 50);
    return { items };
  });
  app.post("/v1/memories", auth, async (req, reply) => {
    const b = parse(MemoryBody, req.body);
    return reply.code(201).send(await repos.memories.add(uid(req), b.kind, b.content));
  });
  app.delete<{ Params: { id: string } }>("/v1/memories/:id", auth, async (req) => {
    checkId(req.params.id, "Memória");
    if (!(await repos.memories.remove(uid(req), req.params.id))) throw notFound("Memória");
    return { ok: true };
  });

  app.get("/v1/tasks", auth, async (req) => {
    const { status } = parse(z.object({ status: z.enum(["open", "done"]).optional() }), req.query);
    return { items: await repos.tasks.list(uid(req), status) };
  });
  app.post("/v1/tasks", auth, async (req, reply) => {
    const b = parse(TaskCreate, req.body);
    return reply.code(201).send(await repos.tasks.add({ userId: uid(req), title: b.title, notes: b.notes, dueAt: b.dueAt }));
  });
  app.patch<{ Params: { id: string } }>("/v1/tasks/:id", auth, async (req) => {
    const b = parse(TaskPatch, req.body);
    checkId(req.params.id, "Tarefa");
    const t = await repos.tasks.update(uid(req), req.params.id, b);
    if (!t) throw notFound("Tarefa");
    return t;
  });

  app.get("/v1/usage", auth, async (req) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(90).default(1) }), req.query);
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const [spentUsd, items] = await Promise.all([repos.usage.costSince(uid(req), since), repos.usage.summary(uid(req), since)]);
    return { limitUsd: config.dailyBudgetUsd, spentUsd, items };
  });

  app.get("/v1/audit", auth, async (req) => {
    const { limit } = parse(z.object({ limit: limitQ }), req.query);
    return { items: await repos.audit.list(uid(req), limit ?? 50) };
  });

  app.post("/v1/devices", auth, async (req) => {
    const b = parse(DeviceBody, req.body);
    await repos.devices.upsert({ userId: uid(req), apnsToken: b.apnsToken, platform: "ios" });
    return { ok: true };
  });

  for (const plugin of opts.plugins ?? []) await app.register(plugin);
  return app;
}
