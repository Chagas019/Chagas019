import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { createOrchestrator, createToolRegistry } from "./ai/index.js";
import { integrationsPlugin } from "./integrations/index.js";
import { buildApp } from "./server/app.js";
import { loadConfig } from "./server/config.js";
import { createMemoryRepos } from "./server/repos/memory.js";
import { createPostgresRepos } from "./server/repos/postgres.js";

async function loadIntegrationPlugins(deps: Parameters<typeof integrationsPlugin>[0]): Promise<FastifyPluginAsync[]> {
  const p = integrationsPlugin(deps);
  return Array.isArray(p) ? p : [p];
}

/** Monta o app completo (usado pelo servidor local e pela função serverless). */
export async function createJarvisApp(env: NodeJS.ProcessEnv = process.env): Promise<FastifyInstance> {
  const config = loadConfig(env);
  const repos = config.databaseUrl ? createPostgresRepos(config.databaseUrl, { schema: config.databaseSchema }) : createMemoryRepos();
  const tools = createToolRegistry();
  const orchestrator = createOrchestrator({ repos, tools, env });
  const plugins = await loadIntegrationPlugins({ repos, config, tools, orchestrator, env });
  const app = await buildApp({ config, repos, orchestrator, plugins, dbKind: config.databaseUrl ? "postgres" : "memory" });
  if (!config.databaseUrl) app.log.warn("DATABASE_URL ausente: usando repositórios em memória (dados não persistem).");
  return app;
}
