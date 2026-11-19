import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import { prisma, redis } from "../src/lib/core";
import { ensureBootstrap } from "../src/bootstrap";
import { updateSettings, getSettings } from "../src/lib/settings";
import { runScoutCycle } from "../src/agents/scout/scout";
import { generateCopy } from "../src/agents/copywriter/copywriter";
import { distributorTick, publishProduct } from "../src/agents/distributor/distributor";
import * as cb from "../src/lib/circuitBreaker";
import { createApp } from "../src/app";
import { stopAll, resumeAll, dailyClose } from "../src/orchestrator/orchestrator";
import { localDate } from "../src/lib/time";

/**
 * Integração ponta a ponta no AMBIENTE DE TESTES (produtos fictícios, canal dry_run).
 * Usa PostgreSQL e Redis reais. Nenhuma mensagem real é enviada.
 */
const app = createApp();
let token = "";

beforeAll(async () => {
  await redis().flushdb();
  await ensureBootstrap();
  // janela 24h e sem intervalo para o teste
  await updateSettings({ publishWindowStart: "00:00", publishWindowEnd: "00:00", minIntervalMinutes: 1, dailyGoal: 30, dailyLimit: 30, keywordsPerCycle: 3, productsPerKeyword: 20 });
  const r = await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "senha-de-teste-123" });
  token = r.body.token;
});

afterAll(async () => {
  await prisma.$disconnect();
  redis().disconnect();
});

describe("Pipeline Scout → Copywriter → Distributor (sandbox)", () => {
  it("Scout pesquisa, pontua, filtra e aprova apenas nota >= 75", async () => {
    const s = await runScoutCycle(`test-${Date.now()}`);
    expect(s).not.toBeNull();
    expect(s!.researched).toBeGreaterThan(0);
    const approved = await prisma.product.findMany({ where: { state: "APPROVED" } });
    const rejected = await prisma.product.findMany({ where: { state: "REJECTED" } });
    expect(approved.length + rejected.length).toBe(s!.researched);
    for (const p of approved) expect(p.score!).toBeGreaterThanOrEqual(75);
    for (const p of approved) expect(p.source).toBe("SANDBOX");
    for (const p of rejected) expect(p.rejectionReason).toBeTruthy();
    // histórico de preços registrado
    expect(await prisma.productPrice.count()).toBeGreaterThan(0);
    // dados ausentes registrados como indisponíveis, nunca inventados
    const withMissing = await prisma.product.findFirst({ where: { unavailableData: { isEmpty: false } } });
    if (withMissing) {
      if (withMissing.unavailableData.includes("ratingStar")) expect(withMissing.rating).toBeNull();
      if (withMissing.unavailableData.includes("sales")) expect(withMissing.sales).toBeNull();
    }
  });

  it("tarefa duplicada (mesma taskKey) não é executada duas vezes", async () => {
    const key = `dup-${Date.now()}`;
    const first = await runScoutCycle(key);
    const second = await runScoutCycle(key);
    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("Copywriter gera copy válida (template sem IA) e Orchestrator libera para publicação", async () => {
    const approved = await prisma.product.findMany({ where: { state: "APPROVED" }, take: 5 });
    expect(approved.length).toBeGreaterThan(0);
    for (const p of approved) await generateCopy(p.id);
    const ready = await prisma.product.findMany({ where: { id: { in: approved.map((p) => p.id) } }, include: { copies: true } });
    for (const p of ready) {
      expect(p.state).toBe("READY_TO_PUBLISH");
      const c = p.copies[0];
      expect(c.valid).toBe(true);
      expect(c.message).toContain("🔥 OFERTA ENCONTRADA!");
      expect(c.message).toContain("Link de afiliado: podemos receber comissão");
      if (p.rating === null) expect(c.message).not.toContain("Avaliação");
    }
  });

  it("Distributor publica no canal dry_run, respeita intervalo e não duplica", async () => {
    const r1 = await distributorTick();
    expect(r1.action).toBe("published");
    const pub = await prisma.publication.findUniqueOrThrow({ where: { id: r1.publicationId! } });
    expect(pub.channel).toBe("dry_run");
    expect(pub.status).toBe("DRY_RUN");
    const p = await prisma.product.findUniqueOrThrow({ where: { id: r1.productId! } });
    expect(p.state).toBe("PUBLISHED");
    // intervalo mínimo de 1 min → segundo tick imediato aguarda
    const r2 = await distributorTick();
    expect(r2.action).toBe("waiting");
    // histórico completo de estados
    const hist = await prisma.productStateHistory.findMany({ where: { productId: p.id }, orderBy: { createdAt: "asc" } });
    expect(hist.map((h) => h.toState)).toEqual(["PENDING", "RESEARCHING", "APPROVED", "COPY_GENERATED", "READY_TO_PUBLISH", "PUBLISHING", "PUBLISHED"]);
    const m = await prisma.dailyMetrics.findUniqueOrThrow({ where: { date: localDate() } });
    expect(m.dryRunPublished).toBe(1);
    expect(m.published).toBe(0); // dry-run não conta como publicação real
  });

  it("idempotência: mesmo produto/canal/dia não é enviado duas vezes", async () => {
    const pub = await prisma.publication.findFirstOrThrow({ where: { status: "DRY_RUN" } });
    await prisma.product.update({ where: { id: pub.productId }, data: { state: "READY_TO_PUBLISH" } });
    const r = await publishProduct(pub.productId, pub.copyId, "dry_run", await getSettings());
    expect(r.reason).toBe("idempotente");
    expect(await prisma.publication.count({ where: { productId: pub.productId } })).toBe(1);
  });

  it("circuit breaker suspende a publicação após falhas consecutivas", async () => {
    await cb.reset("test");
    const s = await getSettings();
    for (let i = 0; i < s.circuitBreakerThreshold; i++) await cb.recordFailure("send_error", "falha simulada no teste");
    expect((await getSettings()).publishingPaused).toBe(true);
    await prisma.publication.updateMany({ data: { sentAt: new Date(Date.now() - 3600_000) } });
    const r = await distributorTick();
    expect(r).toMatchObject({ action: "waiting", reason: expect.stringMatching(/pausada/) });
    await cb.reset("test");
    expect((await getSettings()).publishingPaused).toBe(false);
  });

  it("STOP ALL interrompe agentes", async () => {
    await stopAll("test");
    await expect(runScoutCycle(`halt-${Date.now()}`)).rejects.toThrow(/STOP ALL/);
    const agents = await prisma.agent.findMany();
    expect(agents.every((a) => a.status === "STOPPED" || a.status === "ERROR")).toBe(true);
    await resumeAll("test");
    expect((await getSettings()).systemHalted).toBe(false);
  });

  it("fechamento do dia registra meta não atingida sem inventar ofertas", async () => {
    await dailyClose();
    const m = await prisma.dailyMetrics.findUniqueOrThrow({ where: { date: localDate() } });
    expect(m.goalReached).toBe(false);
    expect(m.goalNote).toMatch(/meta não atingida/);
  });
});

describe("API REST", () => {
  it("exige autenticação", async () => {
    expect((await request(app).get("/api/dashboard")).status).toBe(401);
    expect((await request(app).post("/api/auth/login").send({ email: "admin@test.local", password: "errada" })).status).toBe(401);
  });

  it("dashboard e listagens", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const d = await request(app).get("/api/dashboard").set(auth);
    expect(d.status).toBe(200);
    expect(d.body.mode).toBe("sandbox");
    expect(d.body.today.goal).toBe(30);
    expect(d.body.agents).toHaveLength(4);
    expect((await request(app).get("/api/products?sort=score").set(auth)).body.total).toBeGreaterThan(0);
    expect((await request(app).get("/api/analytics").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/logs").set(auth)).status).toBe(200);
    expect((await request(app).get("/api/history?type=audit").set(auth)).status).toBe(200);
  });

  it("integrações nunca expõem segredos", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const put = await request(app).put("/api/integrations/TELEGRAM_BOT").set(auth).send({ credentials: { botToken: "123456:SEGREDO-NAO-VAZAR" }, config: { chatId: "-100123" } });
    expect(put.status).toBe(200);
    expect(JSON.stringify(put.body)).not.toContain("SEGREDO-NAO-VAZAR");
    const list = await request(app).get("/api/integrations").set(auth);
    expect(JSON.stringify(list.body)).not.toContain("SEGREDO-NAO-VAZAR");
    const row = await prisma.integration.findUniqueOrThrow({ where: { provider: "TELEGRAM_BOT" } });
    expect(row.encryptedCredentials).not.toContain("SEGREDO");
  });

  it("publicação automática bloqueada no ambiente de testes / sem validação", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const r = await request(app).post("/api/settings/auto-publish").set(auth).send({ enabled: true });
    expect(r.status).toBe(409);
    expect((await getSettings()).autoPublish).toBe(false);
  });

  it("verificação real da Shopee falha explicitamente sem credenciais", async () => {
    const auth = { Authorization: `Bearer ${token}` };
    const r = await request(app).post("/api/integrations/SHOPEE_AFFILIATE/verify").set(auth);
    expect(r.body.ok).toBe(false);
    expect(r.body.error).toMatch(/não configurada/);
  });

  it("redirecionador de cliques conta clique real", async () => {
    const link = await prisma.affiliateLink.findFirstOrThrow();
    const r = await request(app).get(`/r/${link.trackCode}`);
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe(link.url);
    expect((await prisma.affiliateLink.findUniqueOrThrow({ where: { id: link.id } })).clicks).toBe(1);
  });
});

vi.setConfig({ testTimeout: 60_000 });
