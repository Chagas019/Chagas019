import { describe, expect, it } from "vitest";
import { DEV, USER_A, USER_B, call, chat, completion, jwt, makeStack, seq, sideEffectTool, sleep } from "./helpers.js";

describe("e2e chat com ferramentas reais + gateway fake", () => {
  it("chat completo com create_task: tarefa aparece em /v1/tasks e é auditada", async () => {
    const s = await makeStack({ handler: seq(() => completion({ tools: [{ name: "create_task", args: { title: "Comprar pão" } }] }), () => completion({ text: "Tarefa criada." })) });
    const r = await chat(s, DEV, { message: "me lembra de comprar pão" });
    expect(r.status).toBe(200);
    expect(r.body.reply).toBe("Tarefa criada.");
    expect(r.body.provider).toBe("gateway");
    expect(r.body.toolCalls).toEqual([{ name: "create_task", status: "ok" }]);
    expect(r.body.usage.costUsd).toBeGreaterThan(0);
    const tasks = await call(s.app, DEV, "GET", "/v1/tasks");
    expect(tasks.body.items.map((t: any) => t.title)).toEqual(["Comprar pão"]);
    const audit = await call(s.app, DEV, "GET", "/v1/audit");
    expect(audit.body.items.some((e: any) => e.action === "tool:create_task" && e.status === "ok")).toBe(true);
    const msgs = await call(s.app, DEV, "GET", `/v1/conversations/${r.body.conversationId}/messages`);
    expect(msgs.body.items.map((m: any) => m.role)).toEqual(["user", "assistant"]);
  });

  it("memória: remember em um chat, recall em outro", async () => {
    const s = await makeStack({
      handler: seq(
        () => completion({ tools: [{ name: "remember", args: { content: "Prefere café sem açúcar" } }] }),
        () => completion({ text: "Anotado." }),
        () => completion({ tools: [{ name: "recall", args: { query: "café" } }] }),
        () => completion({ text: "Você prefere café sem açúcar." }),
      ),
    });
    expect((await chat(s, DEV, { message: "lembre que prefiro café sem açúcar" })).status).toBe(200);
    expect((await call(s.app, DEV, "GET", "/v1/memories?q=café")).body.items).toHaveLength(1);
    const r2 = await chat(s, DEV, { message: "o que sei sobre café?" });
    expect(r2.body.toolCalls).toEqual([{ name: "recall", status: "ok" }]);
    const toolMsg = s.requests[3].messages.find((m: any) => m.role === "tool");
    expect(toolMsg.content).toContain("Prefere café sem açúcar");
  });

  it("ferramenta com efeito: pede confirmação, não executa, e executa 1x só com confirm=true", async () => {
    const { tool, runs } = sideEffectTool();
    const s = await makeStack({ tools: [tool], handler: seq(() => completion({ tools: [{ name: "send_email", args: { to: "a@b.com" } }] }), () => completion({ text: "Enviado." })) });
    const r1 = await chat(s, DEV, { message: "envie um email para a@b.com" });
    expect(r1.status).toBe(200);
    expect(r1.body.pendingConfirmation.summary).toContain("send_email");
    expect(r1.body.pendingAction).toBeUndefined();
    expect(runs).toHaveLength(0);
    const r2 = await chat(s, DEV, { conversationId: r1.body.conversationId, message: "confirmo", confirm: true });
    expect(r2.status).toBe(200);
    expect(runs).toEqual([{ to: "a@b.com" }]);
    // repetir a confirmação não reexecuta (a pendência foi consumida)
    await chat(s, DEV, { conversationId: r1.body.conversationId, message: "confirmo", confirm: true });
    expect(runs).toHaveLength(1);
    const audit = (await call(s.app, DEV, "GET", "/v1/audit")).body.items.filter((e: any) => e.action === "tool:send_email").map((e: any) => e.status);
    expect(audit).toContain("pending_confirmation");
    expect(audit).toContain("ok");
  });

  it("confirm=true sem pendência não executa nada (conversa nova e conversa existente)", async () => {
    const { tool, runs } = sideEffectTool();
    const s = await makeStack({ tools: [tool], handler: () => completion({ text: "Nada a confirmar." }) });
    const n = await chat(s, DEV, { message: "confirmo", confirm: true });
    expect(n.status).toBe(200);
    const e = await chat(s, DEV, { conversationId: n.body.conversationId, message: "sim, envie", confirm: true });
    expect(e.status).toBe(200);
    expect(runs).toHaveLength(0);
    expect((await call(s.app, DEV, "GET", "/v1/audit")).body.items).toHaveLength(0);
  });

  it("pendência não vaza entre conversas nem usuários, e é descartada por mensagem posterior", async () => {
    const { tool, runs } = sideEffectTool();
    const s = await makeStack({ tools: [tool], handler: (_b, n) => (n === 1 ? completion({ tools: [{ name: "send_email", args: { to: "x@y.com" } }] }) : completion({ text: "ok" })) });
    const tA = await jwt(USER_A);
    const tB = await jwt(USER_B);
    const p = await chat(s, tA, { message: "envie email" });
    const convA = p.body.conversationId;
    expect(p.body.pendingConfirmation).toBeTruthy();
    // outra conversa do mesmo usuário
    await chat(s, tA, { message: "confirmo", confirm: true });
    // outro usuário tentando confirmar na conversa de A
    expect((await chat(s, tB, { conversationId: convA, message: "confirmo", confirm: true })).status).toBe(404);
    // nova mensagem normal em A descarta a pendência
    await chat(s, tA, { conversationId: convA, message: "esquece isso" });
    await chat(s, tA, { conversationId: convA, message: "confirmo", confirm: true });
    expect(runs).toHaveLength(0);
  });

  it("loop de ferramentas limitado a 5 iterações", async () => {
    const s = await makeStack({ handler: () => completion({ tools: [{ name: "current_time" }] }) });
    const r = await chat(s, DEV, { message: "hora?" });
    expect(r.status).toBe(200);
    expect(s.requests).toHaveLength(5);
    expect(r.body.reply).toMatch(/limite de passos/);
    expect(r.body.toolCalls).toHaveLength(5);
  });

  it("ferramenta desconhecida e entrada inválida viram erro auditado, sem derrubar o chat", async () => {
    const s = await makeStack({ handler: seq(() => completion({ tools: [{ name: "rm_rf", args: {} }, { name: "create_task", args: { title: "" } }] }), () => completion({ text: "ok" })) });
    const r = await chat(s, DEV, { message: "teste" });
    expect(r.status).toBe(200);
    expect(r.body.toolCalls.map((t: any) => t.status)).toEqual(["error", "error"]);
    expect((await call(s.app, DEV, "GET", "/v1/audit")).body.items).toHaveLength(2);
  });

  // ACHADO F-04 (média): sem teto de tool calls por iteração; 1 resposta do modelo pode disparar N escritas.
  it("F-04: limita a quantidade de tool calls por iteração (<= 10)", async () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ name: "create_task", args: { title: `t${i}` }, id: `c${i}` }));
    const s = await makeStack({ handler: seq(() => completion({ tools: many }), () => completion({ text: "ok" })) });
    await chat(s, DEV, { message: "crie tarefas" });
    expect((await call(s.app, DEV, "GET", "/v1/tasks")).body.items.length).toBeLessThanOrEqual(10);
  });

  // ACHADO F-03 (média): confirmações concorrentes leem a mesma pendência => execução dupla.
  it("F-03: duas confirmações concorrentes executam a ação apenas uma vez", async () => {
    const { tool, runs } = sideEffectTool(40);
    const s = await makeStack({
      tools: [tool],
      handler: async (_b, n) => { if (n > 1) await sleep(30); return n === 1 ? completion({ tools: [{ name: "send_email", args: { to: "a@b.com" } }] }) : completion({ text: "ok" }); },
    });
    const r1 = await chat(s, DEV, { message: "envie email" });
    const c = r1.body.conversationId;
    await Promise.all([chat(s, DEV, { conversationId: c, message: "confirmo", confirm: true }), chat(s, DEV, { conversationId: c, message: "confirmo", confirm: true })]);
    expect(runs).toHaveLength(1);
  });

  // ACHADO F-09 (baixa): meta.pending (ferramenta + input) é devolvido por GET /messages, contrariando "nunca enviado ao cliente".
  it("F-09: GET /messages não expõe meta.pending", async () => {
    const { tool } = sideEffectTool();
    const s = await makeStack({ tools: [tool], handler: () => completion({ tools: [{ name: "send_email", args: { to: "a@b.com" } }] }) });
    const r = await chat(s, DEV, { message: "envie email" });
    const msgs = await call(s.app, DEV, "GET", `/v1/conversations/${r.body.conversationId}/messages`);
    expect(JSON.stringify(msgs.body)).not.toContain("send_email\",\"input");
    expect(msgs.body.items.some((m: any) => m.meta?.pending)).toBe(false);
  });
});
