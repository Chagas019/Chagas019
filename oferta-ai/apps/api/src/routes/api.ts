import { Router, type Request, type Response, type NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { IntegrationProvider, ProductState, PublicationStatus } from "@prisma/client";
import { prisma, errMsg } from "../lib/core";
import { env } from "../config/env";
import { getSettings, updateSettings, settingsSchema } from "../lib/settings";
import { ensureToday } from "../lib/metrics";
import { localDate, startOfLocalDay } from "../lib/time";
import * as cb from "../lib/circuitBreaker";
import { login, authenticate, requireRole, audit } from "../auth/auth";
import { publicIntegration, saveIntegration, resolveIntegration, markVerification } from "../integrations/store";
import { getLiveShopeeClient } from "../integrations/shopee";
import { WhatsAppCloudClient } from "../integrations/whatsapp/cloudApi";
import { verifyChannel, channelReadiness } from "../agents/distributor/channels";
import { effectiveChannel, confirmManual, cancelManual } from "../agents/distributor/distributor";
import { effectiveIntervalMinutes } from "../agents/distributor/schedule";
import { triggerScout, enqueueCopies, stopAll, resumeAll, queueStats, scheduleRepeatables, queues } from "../orchestrator/orchestrator";
import { transition } from "../orchestrator/states";
import { getLlm } from "../integrations/ai/llm";
import { ALL_CATEGORIES } from "../agents/scout/categories";

const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) =>
  fn(req, res).catch(next);

export const api = Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: "muitas tentativas, aguarde" } });

api.post(
  "/auth/login",
  loginLimiter,
  wrap(async (req, res) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);
    const r = await login(body.email, body.password);
    if (!r) return res.status(401).json({ error: "credenciais inválidas" });
    await prisma.auditLog.create({ data: { userId: r.user.id, action: "auth.login", ip: req.ip } });
    res.json(r);
  }),
);

api.use(authenticate);

api.get("/auth/me", (req, res) => res.json({ user: req.user }));

// ─── Dashboard ───────────────────────────────────────────────────────────────
api.get(
  "/dashboard",
  wrap(async (_req, res) => {
    const s = await getSettings();
    const today = await ensureToday();
    const since = startOfLocalDay();
    const [agents, byState, recentPubs, week, failures] = await Promise.all([
      prisma.agent.findMany({ orderBy: { kind: "asc" } }),
      prisma.product.groupBy({ by: ["state"], _count: true }),
      prisma.publication.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { product: { select: { name: true, currentPrice: true, category: true, score: true } } },
      }),
      prisma.dailyMetrics.findMany({ orderBy: { date: "desc" }, take: 14 }),
      cb.failureCount(),
    ]);
    const publishedTotal = today.published + today.dryRunPublished;
    res.json({
      mode: env.DATA_MODE,
      channel: effectiveChannel(s),
      today: { ...today, publishedTotal, publishRate: today.goal ? Math.round((publishedTotal / today.goal) * 100) : 0 },
      states: Object.fromEntries(byState.map((b) => [b.state, b._count])),
      agents,
      recentPublications: recentPubs,
      series: week.reverse(),
      control: {
        systemHalted: s.systemHalted,
        publishingPaused: s.publishingPaused,
        publishingPausedReason: s.publishingPausedReason,
        autoPublish: s.autoPublish,
        circuitFailures: failures,
        circuitThreshold: s.circuitBreakerThreshold,
        intervalMinutes: effectiveIntervalMinutes(s.publishWindowStart, s.publishWindowEnd, s.dailyGoal, s.minIntervalMinutes),
        window: `${s.publishWindowStart}–${s.publishWindowEnd}`,
      },
    });
  }),
);

// ─── Agentes ─────────────────────────────────────────────────────────────────
api.get(
  "/agents",
  wrap(async (_req, res) => {
    const agents = await prisma.agent.findMany({ orderBy: { kind: "asc" } });
    const stats = await Promise.all(
      agents.map(async (a) => {
        const since = new Date(Date.now() - 86_400_000);
        const [ok, failed, last] = await Promise.all([
          prisma.agentExecution.count({ where: { agentId: a.id, status: "SUCCESS", startedAt: { gte: since } } }),
          prisma.agentExecution.count({ where: { agentId: a.id, status: "FAILED", startedAt: { gte: since } } }),
          prisma.agentExecution.findMany({ where: { agentId: a.id }, orderBy: { startedAt: "desc" }, take: 10 }),
        ]);
        return { ...a, last24h: { success: ok, failed }, recent: last };
      }),
    );
    res.json({ agents: stats, queues: await queueStats() });
  }),
);

api.get(
  "/agents/:kind/executions",
  wrap(async (req, res) => {
    const kind = z.enum(["SCOUT", "COPYWRITER", "DISTRIBUTOR", "ORCHESTRATOR"]).parse(req.params.kind);
    const agent = await prisma.agent.findUniqueOrThrow({ where: { kind } });
    const items = await prisma.agentExecution.findMany({ where: { agentId: agent.id }, orderBy: { startedAt: "desc" }, take: 100 });
    res.json({ agent, items });
  }),
);

api.post(
  "/agents/scout/run",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    await triggerScout(`manual-${Date.now()}`);
    await audit(req, "agent.scout.run");
    res.json({ ok: true, message: "pesquisa enfileirada" });
  }),
);

api.post(
  "/agents/copywriter/run",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    const n = await enqueueCopies();
    await audit(req, "agent.copywriter.run", undefined, { n });
    res.json({ ok: true, enqueued: n });
  }),
);

api.post(
  "/agents/distributor/tick",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    await queues().orchQueue.add("distributor-tick", {}, { removeOnComplete: 50 });
    await audit(req, "agent.distributor.tick");
    res.json({ ok: true });
  }),
);

// ─── Produtos ────────────────────────────────────────────────────────────────
api.get(
  "/products",
  wrap(async (req, res) => {
    const q = z
      .object({
        state: z.nativeEnum(ProductState).optional(),
        states: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(25),
        sort: z.enum(["score", "recent", "price"]).default("recent"),
      })
      .parse(req.query);
    const states = q.states ? (q.states.split(",") as ProductState[]) : q.state ? [q.state] : undefined;
    const where = {
      ...(states ? { state: { in: states } } : {}),
      ...(q.category ? { category: q.category } : {}),
      ...(q.search ? { name: { contains: q.search, mode: "insensitive" as const } } : {}),
    };
    const orderBy = q.sort === "score" ? { score: "desc" as const } : q.sort === "price" ? { currentPrice: "asc" as const } : { updatedAt: "desc" as const };
    const [items, total] = await Promise.all([
      prisma.product.findMany({ where, orderBy, skip: (q.page - 1) * q.pageSize, take: q.pageSize, include: { copies: { orderBy: { createdAt: "desc" }, take: 1 } } }),
      prisma.product.count({ where }),
    ]);
    res.json({ items, total, page: q.page, pageSize: q.pageSize, categories: ALL_CATEGORIES });
  }),
);

api.get(
  "/products/:id",
  wrap(async (req, res) => {
    const p = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        prices: { orderBy: { capturedAt: "asc" }, take: 200 },
        reviews: { orderBy: { capturedAt: "desc" }, take: 20 },
        affiliateLinks: true,
        copies: { orderBy: { createdAt: "desc" } },
        publications: { orderBy: { createdAt: "desc" }, include: { logs: true } },
        stateHistory: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!p) return res.status(404).json({ error: "produto não encontrado" });
    res.json(p);
  }),
);

api.post(
  "/products/:id/reject",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } });
    const reason = `rejeitado manualmente por ${req.user!.email}`;
    const ok = await transition(p.id, p.state, "REJECTED", req.user!.email, reason, { rejectionReason: reason });
    await audit(req, "product.reject", p.id);
    res.json({ ok });
  }),
);

api.post(
  "/products/:id/regenerate-copy",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } });
    if (p.state !== "READY_TO_PUBLISH" && p.state !== "COPY_GENERATED") return res.status(409).json({ error: `estado ${p.state} não permite regerar copy` });
    await transition(p.id, p.state, "APPROVED", req.user!.email, "regerar copy");
    await enqueueCopies();
    await audit(req, "product.regenerate-copy", p.id);
    res.json({ ok: true });
  }),
);

api.post(
  "/products/:id/retry",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    const p = await prisma.product.findUniqueOrThrow({ where: { id: req.params.id } });
    if (p.state !== "FAILED") return res.status(409).json({ error: "apenas produtos FAILED podem ser reprocessados" });
    const hasCopy = await prisma.generatedCopy.findFirst({ where: { productId: p.id, valid: true } });
    await transition(p.id, "FAILED", hasCopy ? "READY_TO_PUBLISH" : "APPROVED", req.user!.email, "reprocessar", { retries: { increment: 1 } });
    if (!hasCopy) await enqueueCopies();
    await audit(req, "product.retry", p.id);
    res.json({ ok: true });
  }),
);

// ─── Publicações ─────────────────────────────────────────────────────────────
api.get(
  "/publications",
  wrap(async (req, res) => {
    const q = z.object({ status: z.string().optional(), page: z.coerce.number().int().min(1).default(1) }).parse(req.query);
    const statuses = q.status ? (q.status.split(",") as PublicationStatus[]) : undefined;
    const where = statuses ? { status: { in: statuses } } : {};
    const [items, total, ready] = await Promise.all([
      prisma.publication.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (q.page - 1) * 30,
        take: 30,
        include: { product: { select: { id: true, name: true, category: true, currentPrice: true, score: true, source: true } }, copy: true, logs: { orderBy: { createdAt: "asc" } } },
      }),
      prisma.publication.count({ where }),
      prisma.product.findMany({
        where: { state: "READY_TO_PUBLISH" },
        orderBy: { priority: "desc" },
        take: 30,
        include: { copies: { where: { valid: true }, orderBy: { createdAt: "desc" }, take: 1 } },
      }),
    ]);
    res.json({ items, total, queue: ready });
  }),
);

api.post(
  "/publications/:id/confirm",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    await confirmManual(req.params.id, req.user!.email);
    await audit(req, "publication.manual.confirm", req.params.id);
    res.json({ ok: true });
  }),
);

api.post(
  "/publications/:id/cancel",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    await cancelManual(req.params.id, req.user!.email);
    await audit(req, "publication.manual.cancel", req.params.id);
    res.json({ ok: true });
  }),
);

// ─── Histórico ───────────────────────────────────────────────────────────────
api.get(
  "/history",
  wrap(async (req, res) => {
    const q = z.object({ type: z.enum(["states", "executions", "audit"]).default("states"), page: z.coerce.number().int().min(1).default(1) }).parse(req.query);
    const skip = (q.page - 1) * 50;
    if (q.type === "executions") {
      const items = await prisma.agentExecution.findMany({ orderBy: { startedAt: "desc" }, skip, take: 50, include: { agent: { select: { kind: true, name: true } } } });
      return res.json({ items });
    }
    if (q.type === "audit") {
      if (req.user!.role !== "ADMIN") return res.status(403).json({ error: "requer ADMIN" });
      const items = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip, take: 50, include: { user: { select: { email: true } } } });
      return res.json({ items });
    }
    const items = await prisma.productStateHistory.findMany({ orderBy: { createdAt: "desc" }, skip, take: 50, include: { product: { select: { name: true, category: true } } } });
    res.json({ items });
  }),
);

// ─── Analytics ───────────────────────────────────────────────────────────────
api.get(
  "/analytics",
  wrap(async (req, res) => {
    const days = z.coerce.number().int().min(1).max(90).default(30).parse(req.query.days);
    const since = new Date(Date.now() - days * 86_400_000);
    const done = { in: ["SENT", "MANUAL_CONFIRMED", "DRY_RUN"] as PublicationStatus[] };
    const [daily, pubs, researched, links, execs] = await Promise.all([
      prisma.dailyMetrics.findMany({ where: { date: { gte: localDate(since) } }, orderBy: { date: "asc" } }),
      prisma.publication.findMany({ where: { status: done, sentAt: { gte: since } }, include: { product: { select: { id: true, name: true, category: true, commissionValue: true } } } }),
      prisma.product.groupBy({ by: ["category"], where: { lastSeenAt: { gte: since } }, _count: true, _avg: { score: true } }),
      prisma.affiliateLink.findMany({ where: { clicks: { gt: 0 } }, orderBy: { clicks: "desc" }, take: 10, include: { product: { select: { name: true, category: true } } } }),
      prisma.agentExecution.groupBy({ by: ["agentId", "status"], where: { startedAt: { gte: since } }, _count: true, _avg: { durationMs: true } }),
    ]);
    const agents = await prisma.agent.findMany();
    const byCategory: Record<string, { published: number; researched: number; avgScore: number | null; estCommission: number }> = {};
    for (const r of researched) byCategory[r.category] = { published: 0, researched: r._count, avgScore: r._avg.score, estCommission: 0 };
    const topPublished: Record<string, { name: string; count: number }> = {};
    for (const p of pubs) {
      const c = (byCategory[p.product.category] ??= { published: 0, researched: 0, avgScore: null, estCommission: 0 });
      c.published++;
      if (p.channel !== "dry_run") c.estCommission += Number(p.product.commissionValue ?? 0);
      (topPublished[p.product.id] ??= { name: p.product.name, count: 0 }).count++;
    }
    const mostResearched = await prisma.productReview.groupBy({ by: ["productId"], where: { capturedAt: { gte: since } }, _count: true, orderBy: { _count: { productId: "desc" } }, take: 10 });
    const names = await prisma.product.findMany({ where: { id: { in: mostResearched.map((m) => m.productId) } }, select: { id: true, name: true } });
    res.json({
      days,
      daily,
      byCategory,
      mostResearched: mostResearched.map((m) => ({ name: names.find((n) => n.id === m.productId)?.name ?? m.productId, count: m._count })),
      mostPublished: Object.values(topPublished).sort((a, b) => b.count - a.count).slice(0, 10),
      topClicked: links.map((l) => ({ name: l.product.name, category: l.product.category, clicks: l.clicks })),
      clickTracking: Boolean(env.PUBLIC_BASE_URL),
      totals: {
        estimatedCommission: daily.reduce((a, d) => a + Number(d.estimatedCommission), 0),
        reportedCommission: daily.some((d) => d.reportedCommission !== null) ? daily.reduce((a, d) => a + Number(d.reportedCommission ?? 0), 0) : null,
        clicks: daily.reduce((a, d) => a + d.clicks, 0),
        published: daily.reduce((a, d) => a + d.published, 0),
        dryRun: daily.reduce((a, d) => a + d.dryRunPublished, 0),
        conversions: null, // somente com relatório oficial da Shopee
      },
      agents: agents.map((a) => ({
        kind: a.kind,
        name: a.name,
        stats: execs.filter((e) => e.agentId === a.id).map((e) => ({ status: e.status, count: e._count, avgMs: Math.round(e._avg.durationMs ?? 0) })),
      })),
    });
  }),
);

api.post(
  "/analytics/sync-commissions",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    if (env.DATA_MODE === "sandbox") return res.status(409).json({ error: "indisponível no ambiente de testes (sem dados reais)" });
    const client = await getLiveShopeeClient();
    const days = 7;
    const end = Math.floor(Date.now() / 1000);
    const start = end - days * 86400;
    const nodes = await client.conversionReport(start, end);
    const perDay: Record<string, number> = {};
    for (const n of nodes) {
      const d = localDate(new Date(Number(n.purchaseTime) * 1000));
      perDay[d] = (perDay[d] ?? 0) + Number(n.totalCommission ?? 0);
    }
    for (const [date, v] of Object.entries(perDay)) {
      await ensureToday(date);
      await prisma.dailyMetrics.update({ where: { date }, data: { reportedCommission: v.toFixed(2) } });
    }
    await audit(req, "analytics.sync-commissions", undefined, { conversions: nodes.length });
    res.json({ ok: true, conversions: nodes.length, perDay });
  }),
);

// ─── Configurações ───────────────────────────────────────────────────────────
api.get("/settings", wrap(async (_req, res) => res.json({ settings: await getSettings(), categories: ALL_CATEGORIES, mode: env.DATA_MODE, timezone: env.TZ_APP })));

api.put(
  "/settings",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    // autoPublish e flags de controle têm endpoints próprios com validação
    const patch = settingsSchema.partial().omit({ autoPublish: true, systemHalted: true, publishingPaused: true, publishingPausedReason: true }).parse(req.body);
    const next = await updateSettings(patch, req.user!.email);
    await scheduleRepeatables();
    await audit(req, "settings.update", undefined, patch);
    res.json({ settings: next });
  }),
);

api.post(
  "/settings/auto-publish",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { enabled } = z.object({ enabled: z.boolean() }).parse(req.body);
    const s = await getSettings();
    if (enabled) {
      if (env.DATA_MODE === "sandbox") return res.status(409).json({ error: "Ambiente de testes: publicação real bloqueada. Configure DATA_MODE=live." });
      if (s.primaryChannel === "manual") return res.status(409).json({ error: "Canal principal é manual; selecione um canal automático." });
      const rd = await channelReadiness(s.primaryChannel);
      if (!rd.ready) return res.status(409).json({ error: "Validação pendente", reasons: rd.reasons });
      const shopee = await resolveIntegration("SHOPEE_AFFILIATE");
      if (shopee.row?.status !== "VERIFIED") return res.status(409).json({ error: "Validação pendente", reasons: ["Shopee Affiliate API não verificada"] });
    }
    const next = await updateSettings({ autoPublish: enabled }, req.user!.email);
    await audit(req, "settings.auto-publish", undefined, { enabled });
    res.json({ settings: next });
  }),
);

// ─── Integrações ─────────────────────────────────────────────────────────────
const PROVIDERS = Object.values(IntegrationProvider);
api.get(
  "/integrations",
  wrap(async (_req, res) => {
    res.json({ mode: env.DATA_MODE, items: await Promise.all(PROVIDERS.map((p) => publicIntegration(p))) });
  }),
);

api.put(
  "/integrations/:provider",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const provider = z.nativeEnum(IntegrationProvider).parse(req.params.provider);
    const body = z.object({ credentials: z.record(z.string(), z.string()).optional(), config: z.record(z.string(), z.string()).optional() }).parse(req.body);
    await saveIntegration(provider, body);
    await audit(req, "integration.update", provider, { credentialKeys: Object.keys(body.credentials ?? {}), config: body.config });
    res.json(await publicIntegration(provider));
  }),
);

api.post(
  "/integrations/:provider/verify",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const provider = z.nativeEnum(IntegrationProvider).parse(req.params.provider);
    let result: { ok: boolean; error?: string; details?: unknown };
    try {
      if (provider === "SHOPEE_AFFILIATE") {
        const c = await getLiveShopeeClient();
        const r = await c.verify();
        await markVerification(provider, true, r);
        result = { ok: true, details: r };
      } else if (provider === "WHATSAPP_CLOUD") result = await verifyChannel("whatsapp_cloud");
      else if (provider === "TELEGRAM_BOT") result = await verifyChannel("telegram");
      else {
        const llm = await getLlm();
        if (!llm) throw new Error("ANTHROPIC apiKey ausente");
        const r = await llm.json<{ ok: boolean }>({
          system: "Responda somente o JSON solicitado.",
          user: 'Retorne {"ok": true}.',
          schema: { type: "object", properties: { ok: { type: "boolean" } }, required: ["ok"], additionalProperties: false },
          maxTokens: 1000,
        });
        await markVerification(provider, true, { model: r.model });
        result = { ok: true, details: { model: r.model } };
      }
    } catch (err) {
      await markVerification(provider, false, {}, errMsg(err));
      result = { ok: false, error: errMsg(err) };
    }
    await audit(req, "integration.verify", provider, { ok: result.ok });
    res.json({ ...result, integration: await publicIntegration(provider) });
  }),
);

api.post(
  "/integrations/:provider/consent",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const provider = z.enum(["WHATSAPP_CLOUD", "TELEGRAM_BOT"]).parse(req.params.provider);
    const { confirmed } = z.object({ confirmed: z.boolean() }).parse(req.body);
    await prisma.integration.upsert({
      where: { provider },
      create: { provider, consentConfirmed: confirmed, consentBy: req.user!.email, consentAt: new Date() },
      update: { consentConfirmed: confirmed, consentBy: req.user!.email, consentAt: new Date() },
    });
    if (!confirmed) await updateSettings({ autoPublish: false }, req.user!.email);
    await audit(req, "integration.consent", provider, { confirmed });
    res.json(await publicIntegration(provider));
  }),
);

api.post(
  "/integrations/WHATSAPP_CLOUD/create-group",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    const { subject, description } = z.object({ subject: z.string().min(1).max(100), description: z.string().max(500).optional() }).parse(req.body);
    const r = await resolveIntegration("WHATSAPP_CLOUD");
    if (!r.creds.token || !r.config.phoneNumberId) return res.status(409).json({ error: "configure token e phoneNumberId primeiro" });
    const c = new WhatsAppCloudClient(r.creds.token, r.config.phoneNumberId, r.config.graphVersion);
    try {
      const g = await c.createGroup(subject, description);
      await audit(req, "whatsapp.group.create", g.id ?? g.request_id, { subject });
      let invite: string | undefined;
      if (g.id) {
        await saveIntegration("WHATSAPP_CLOUD", { config: { groupId: g.id } });
        invite = (await c.getInviteLink(g.id).catch(() => ({ invite_link: undefined }))).invite_link;
      }
      res.json({ ok: true, group: g, inviteLink: invite ?? null });
    } catch (err) {
      res.status(502).json({ ok: false, error: errMsg(err) });
    }
  }),
);

// ─── Logs ────────────────────────────────────────────────────────────────────
api.get(
  "/logs",
  wrap(async (req, res) => {
    const q = z.object({ level: z.string().optional(), source: z.string().optional(), page: z.coerce.number().int().min(1).default(1) }).parse(req.query);
    const where = { ...(q.level ? { level: q.level } : {}), ...(q.source ? { source: q.source } : {}) };
    const [items, sources] = await Promise.all([
      prisma.systemLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (q.page - 1) * 100, take: 100 }),
      prisma.systemLog.groupBy({ by: ["source"], _count: true }),
    ]);
    res.json({ items, sources: sources.map((s) => s.source) });
  }),
);

// ─── Sistema ─────────────────────────────────────────────────────────────────
api.get(
  "/system/status",
  wrap(async (_req, res) => {
    const s = await getSettings();
    res.json({ mode: env.DATA_MODE, settings: s, queues: await queueStats(), circuitFailures: await cb.failureCount() });
  }),
);

api.post(
  "/system/stop-all",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    await stopAll(req.user!.email);
    await audit(req, "system.stop-all");
    res.json({ ok: true });
  }),
);

api.post(
  "/system/resume",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    await resumeAll(req.user!.email);
    await audit(req, "system.resume");
    res.json({ ok: true });
  }),
);

api.post(
  "/system/circuit-breaker/reset",
  requireRole("ADMIN"),
  wrap(async (req, res) => {
    await cb.reset(req.user!.email);
    await audit(req, "system.circuit-breaker.reset");
    res.json({ ok: true });
  }),
);

api.post(
  "/system/pause-publishing",
  requireRole("OPERATOR"),
  wrap(async (req, res) => {
    await updateSettings({ publishingPaused: true, publishingPausedReason: `pausado manualmente por ${req.user!.email}` }, req.user!.email);
    await audit(req, "system.pause-publishing");
    res.json({ ok: true });
  }),
);
