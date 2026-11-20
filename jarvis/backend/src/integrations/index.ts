import type { FastifyPluginAsync } from "fastify";
import type { Orchestrator, Repos, ToolRegistry } from "../core/types.js";
import type { Config } from "../server/config.js";
import { AppError } from "../server/errors.js";
import { createGoogleAuth, type FetchFn } from "./google/oauth.js";
import { registerGoogleTools } from "./tools.js";

export interface IntegrationsDeps {
  repos: Repos;
  config: Config;
  tools: ToolRegistry;
  orchestrator?: Orchestrator;
  env: NodeJS.ProcessEnv;
  /** Injetável para testes (sem rede). */
  fetch?: FetchFn;
  now?: () => number;
}

export function integrationsPlugin(deps: IntegrationsDeps): FastifyPluginAsync {
  const auth = createGoogleAuth({ repos: deps.repos, encryptionKey: deps.config.encryptionKey, env: deps.env, fetch: deps.fetch, now: deps.now });
  registerGoogleTools(deps.tools, auth);

  return async (app) => {
    const pre = { preHandler: app.requireAuth };
    const done = (ok: boolean, error?: string) => `jarvis://oauth/done?ok=${ok ? 1 : 0}${error ? `&error=${encodeURIComponent(error)}` : ""}`;

    app.get("/v1/integrations", pre, async (req) => ({ google: await auth.status(req.user.userId) }));

    app.get("/v1/integrations/google/start", pre, async (req) => {
      if (!auth.configured) throw new AppError(503, "provider_unavailable", `Integração Google não configurada: ${auth.missingReason()}.`);
      return { url: await auth.startUrl(req.user.userId) };
    });

    app.get("/v1/integrations/google/callback", async (req, reply) => {
      const q = (req.query ?? {}) as Record<string, unknown>;
      const s = (v: unknown) => (typeof v === "string" ? v : undefined);
      const r = await auth.handleCallback({ code: s(q.code), state: s(q.state), error: s(q.error) });
      return reply.redirect(r.ok ? done(true) : done(false, r.error), 302);
    });

    app.delete("/v1/integrations/google", pre, async (req) => {
      await auth.disconnect(req.user.userId);
      return { ok: true };
    });
  };
}
