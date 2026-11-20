import { describe, expect, it } from "vitest";
import { USER_A, USER_B, call, chat, completion, jwt, makeStack, seq } from "./helpers.js";

describe("e2e isolamento entre usuários (IDOR)", () => {
  async function setup() {
    const s = await makeStack({
      handler: seq(
        () => completion({ tools: [{ name: "remember", args: { content: "segredo da A" } }, { name: "create_task", args: { title: "tarefa da A" } }] }),
        () => completion({ text: "ok" }),
      ),
    });
    const tA = await jwt(USER_A);
    const tB = await jwt(USER_B);
    const r = await chat(s, tA, { message: "anote" });
    const conv = r.body.conversationId as string;
    const mem = (await call(s.app, tA, "GET", "/v1/memories")).body.items[0];
    const task = (await call(s.app, tA, "GET", "/v1/tasks")).body.items[0];
    return { s, tA, tB, conv, mem, task };
  }

  it("B não vê conversas, mensagens, memórias, tarefas, auditoria nem uso de A", async () => {
    const { s, tA, tB, conv } = await setup();
    expect((await call(s.app, tA, "GET", "/v1/conversations")).body.items).toHaveLength(1);
    expect((await call(s.app, tB, "GET", "/v1/conversations")).body.items).toHaveLength(0);
    expect((await call(s.app, tB, "GET", `/v1/conversations/${conv}/messages`)).status).toBe(404);
    expect((await call(s.app, tB, "GET", "/v1/memories")).body.items).toHaveLength(0);
    expect((await call(s.app, tB, "GET", "/v1/memories?q=segredo")).body.items).toHaveLength(0);
    expect((await call(s.app, tB, "GET", "/v1/tasks")).body.items).toHaveLength(0);
    expect((await call(s.app, tB, "GET", "/v1/audit")).body.items).toHaveLength(0);
    const u = await call(s.app, tB, "GET", "/v1/usage");
    expect(u.body.spentUsd).toBe(0);
    expect(u.body.items).toEqual([]);
  });

  it("B não consegue alterar/apagar recursos de A nem conversar na conversa de A", async () => {
    const { s, tA, tB, conv, mem, task } = await setup();
    expect((await call(s.app, tB, "DELETE", `/v1/memories/${mem.id}`)).status).toBe(404);
    expect((await call(s.app, tB, "PATCH", `/v1/tasks/${task.id}`, { status: "done" })).status).toBe(404);
    expect((await chat(s, tB, { conversationId: conv, message: "oi" })).status).toBe(404);
    // A continua com tudo intacto
    expect((await call(s.app, tA, "GET", "/v1/memories")).body.items).toHaveLength(1);
    expect((await call(s.app, tA, "GET", "/v1/tasks")).body.items[0].status).toBe("open");
    expect((await call(s.app, tA, "GET", `/v1/conversations/${conv}/messages`)).body.items).toHaveLength(2);
  });

  it("ferramentas do modelo agem só no usuário autenticado (complete_task com id de outro usuário falha)", async () => {
    let taskId = "";
    const s = await makeStack({ handler: seq(() => completion({ tools: [{ name: "complete_task", args: { id: taskId } }] }), () => completion({ text: "ok" })) });
    const tA = await jwt(USER_A);
    const tB = await jwt(USER_B);
    taskId = (await call(s.app, tA, "POST", "/v1/tasks", { title: "da A" })).body.id;
    const r = await chat(s, tB, { message: "conclua a tarefa" });
    expect(r.body.toolCalls).toEqual([{ name: "complete_task", status: "error" }]);
    expect((await call(s.app, tA, "GET", "/v1/tasks")).body.items[0].status).toBe("open");
  });

  it("IDs malformados retornam 404 (sem erro 500)", async () => {
    const s = await makeStack();
    const tB = await jwt(USER_B);
    expect((await call(s.app, tB, "DELETE", "/v1/memories/1%27%20OR%201=1--")).status).toBe(404);
    expect((await call(s.app, tB, "PATCH", "/v1/tasks/not-a-uuid", { status: "done" })).status).toBe(404);
    expect((await call(s.app, tB, "GET", "/v1/conversations/../messages")).status).toBe(404);
  });
});
