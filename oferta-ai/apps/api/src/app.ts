import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { env } from "./config/env";
import { logger, prisma, redis } from "./lib/core";
import { sha256 } from "./lib/crypto";
import { incr } from "./lib/metrics";
import { api } from "./routes/api";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN.split(","), credentials: false }));
  app.use(express.json({ limit: "200kb" }));
  if (env.NODE_ENV !== "test") app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/health" } }));

  app.get("/health", async (_req, res) => {
    const checks: Record<string, string> = {};
    try { await prisma.$queryRaw`SELECT 1`; checks.database = "ok"; } catch { checks.database = "fail"; }
    try { await redis().ping(); checks.redis = "ok"; } catch { checks.redis = "fail"; }
    const ok = Object.values(checks).every((v) => v === "ok");
    res.status(ok ? 200 : 503).json({ status: ok ? "ok" : "degraded", mode: env.DATA_MODE, checks });
  });

  // Redirecionador público de cliques (contagem real de cliques — não confundir com vendas)
  app.get("/r/:code", rateLimit({ windowMs: 60_000, limit: 120 }), async (req, res) => {
    const link = await prisma.affiliateLink.findUnique({ where: { trackCode: req.params.code } });
    if (!link) return res.status(404).send("Link não encontrado");
    await prisma.affiliateLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } });
    await prisma.clickLog.create({ data: { affiliateLinkId: link.id, userAgentHash: sha256(String(req.headers["user-agent"] ?? "")).slice(0, 16) } });
    await incr("clicks").catch(() => undefined);
    res.redirect(302, link.url);
  });

  app.use("/api", rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }), api);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof ZodError) return res.status(400).json({ error: "dados inválidos", issues: err.issues });
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") return res.status(404).json({ error: "não encontrado" });
    logger.error({ err }, "erro não tratado");
    res.status(500).json({ error: err instanceof Error ? err.message : "erro interno" });
  });
  return app;
}
