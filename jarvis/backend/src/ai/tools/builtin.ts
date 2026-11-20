import { z } from "zod";
import type { Tool, ToolContext, ToolResult } from "../../core/types.js";

function parsed<T extends z.ZodType>(schema: T, input: unknown): { ok: true; data: z.infer<T> } | { ok: false; res: ToolResult } {
  const r = schema.safeParse(input ?? {});
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, res: { ok: false, output: `Entrada inválida: ${r.error.issues.map((i) => `${i.path.join(".") || "input"}: ${i.message}`).join("; ")}` } };
}

const isoDate = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "data ISO-8601 inválida").transform((s) => new Date(s).toISOString());

const rememberIn = z.object({ content: z.string().min(1).max(2000), kind: z.enum(["fact", "preference", "summary"]).optional() });
export const rememberTool: Tool = {
  name: "remember",
  description: "Salva uma memória de longo prazo sobre o usuário (fato, preferência ou resumo).",
  sideEffect: false,
  inputSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "O que deve ser lembrado, em uma frase clara." },
      kind: { type: "string", enum: ["fact", "preference", "summary"], description: "Tipo da memória (padrão: fact)." },
    },
    required: ["content"],
  },
  async run(input, ctx: ToolContext) {
    const p = parsed(rememberIn, input);
    if (!p.ok) return p.res;
    const m = await ctx.repos.memories.add(ctx.userId, p.data.kind ?? "fact", p.data.content);
    return { ok: true, output: `Memória salva (id ${m.id}).`, data: m };
  },
};

const recallIn = z.object({ query: z.string().min(1).max(500), limit: z.number().int().min(1).max(20).optional() });
export const recallTool: Tool = {
  name: "recall",
  description: "Busca memórias salvas do usuário relacionadas a um texto.",
  sideEffect: false,
  inputSchema: {
    type: "object",
    properties: { query: { type: "string", description: "Texto de busca." }, limit: { type: "integer", description: "Máximo de resultados (1-20, padrão 5)." } },
    required: ["query"],
  },
  async run(input, ctx) {
    const p = parsed(recallIn, input);
    if (!p.ok) return p.res;
    const items = await ctx.repos.memories.search(ctx.userId, p.data.query, p.data.limit ?? 5);
    return { ok: true, output: items.length ? items.map((m) => `- [${m.kind}] ${m.content}`).join("\n") : "Nenhuma memória encontrada.", data: items };
  },
};

const createTaskIn = z.object({ title: z.string().min(1).max(300), notes: z.string().max(2000).optional(), dueAt: isoDate.optional() });
export const createTaskTool: Tool = {
  name: "create_task",
  description: "Cria uma tarefa/lembrete para o usuário. dueAt opcional em ISO-8601 (o app agenda a notificação).",
  sideEffect: false,
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Título curto da tarefa." },
      notes: { type: "string", description: "Detalhes opcionais." },
      dueAt: { type: "string", description: "Prazo em ISO-8601, ex.: 2026-11-21T09:00:00-03:00." },
    },
    required: ["title"],
  },
  async run(input, ctx) {
    const p = parsed(createTaskIn, input);
    if (!p.ok) return p.res;
    const t = await ctx.repos.tasks.add({ userId: ctx.userId, title: p.data.title, notes: p.data.notes, dueAt: p.data.dueAt });
    return { ok: true, output: `Tarefa criada (id ${t.id}): ${t.title}${t.dueAt ? ` — prazo ${t.dueAt}` : ""}.`, data: t };
  },
};

const listTasksIn = z.object({ status: z.enum(["open", "done"]).optional() });
export const listTasksTool: Tool = {
  name: "list_tasks",
  description: "Lista tarefas do usuário (padrão: todas; filtre por status open/done).",
  sideEffect: false,
  inputSchema: { type: "object", properties: { status: { type: "string", enum: ["open", "done"] } } },
  async run(input, ctx) {
    const p = parsed(listTasksIn, input);
    if (!p.ok) return p.res;
    const items = await ctx.repos.tasks.list(ctx.userId, p.data.status);
    return {
      ok: true,
      output: items.length ? items.map((t) => `- (${t.id}) [${t.status}] ${t.title}${t.dueAt ? ` — ${t.dueAt}` : ""}`).join("\n") : "Nenhuma tarefa.",
      data: items,
    };
  },
};

const completeIn = z.object({ id: z.string().min(1) });
export const completeTaskTool: Tool = {
  name: "complete_task",
  description: "Marca uma tarefa como concluída pelo id (use list_tasks para achar o id).",
  sideEffect: false,
  inputSchema: { type: "object", properties: { id: { type: "string", description: "Id da tarefa." } }, required: ["id"] },
  async run(input, ctx) {
    const p = parsed(completeIn, input);
    if (!p.ok) return p.res;
    const t = await ctx.repos.tasks.update(ctx.userId, p.data.id, { status: "done" });
    return t ? { ok: true, output: `Tarefa concluída: ${t.title}.`, data: t } : { ok: false, output: "Tarefa não encontrada." };
  },
};

export const currentTimeTool: Tool = {
  name: "current_time",
  description: "Retorna a data e hora atuais em America/Sao_Paulo.",
  sideEffect: false,
  inputSchema: { type: "object", properties: {} },
  async run() {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "medium" }).format(now);
    return { ok: true, output: `${fmt} (America/Sao_Paulo). UTC: ${now.toISOString()}`, data: { iso: now.toISOString(), timeZone: "America/Sao_Paulo" } };
  },
};

export const builtinTools: Tool[] = [rememberTool, recallTool, createTaskTool, listTasksTool, completeTaskTool, currentTimeTool];
