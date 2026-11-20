import { z } from "zod";
import type { Tool, ToolContext, ToolRegistry, ToolResult } from "../core/types.js";
import { createCalendar } from "./google/calendar.js";
import { createGmail, type MailSummary } from "./google/gmail.js";
import { GoogleApiError, NotConnectedError, type GoogleAuth } from "./google/oauth.js";

const MAX = 1500;
const cut = (s: string, n = MAX) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const email = z.string().trim().regex(/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/, "e-mail inválido");
const emails = z.union([email, z.array(email).min(1).max(20)]).transform((v) => (Array.isArray(v) ? v : [v]));
const iso = z.string().refine((s) => !Number.isNaN(Date.parse(s)), "data ISO-8601 inválida");
const fail = (output: string): ToolResult => ({ ok: false, output });
const line = (m: MailSummary) => `[${m.id}] ${m.date} | ${m.from} | ${m.subject} — ${m.snippet}`;

export function registerGoogleTools(registry: ToolRegistry, auth: GoogleAuth): void {
  const gmail = createGmail(auth);
  const cal = createCalendar(auth);

  /** Valida input, checa conexão, exige confirmação para efeitos, trata erros e audita. */
  function def<S extends z.ZodType>(
    t: { name: string; description: string; inputSchema: Record<string, unknown>; sideEffect: boolean; schema: S;
      confirmSummary?: (i: z.infer<S>) => string; audit?: (i: z.infer<S>) => Record<string, unknown>;
      exec: (i: z.infer<S>, ctx: ToolContext) => Promise<ToolResult> },
  ): Tool {
    return {
      name: t.name, description: t.description, inputSchema: t.inputSchema, sideEffect: t.sideEffect,
      async run(input, ctx) {
        const p = t.schema.safeParse(input);
        if (!p.success) return fail(cut(`Entrada inválida: ${p.error.issues.map((i) => `${i.path.join(".") || "(raiz)"}: ${i.message}`).join("; ")}`, 300));
        const i = p.data as z.infer<S>;
        const st = await auth.status(ctx.userId);
        if (!st.configured || !st.connected) return fail("Google não conectado");
        if (t.sideEffect && !ctx.confirmed) {
          return { ok: false, output: "aguardando confirmação", needsConfirmation: { summary: t.confirmSummary?.(i) ?? t.name } };
        }
        const audit = async (status: "ok" | "error", extra: Record<string, unknown> = {}) => {
          if (!t.sideEffect && t.name !== "gmail_draft") return;
          try { await ctx.repos.audit.add({ userId: ctx.userId, actor: t.name, action: t.name, status, detail: { ...t.audit?.(i), ...extra } }); } catch { /* auditoria não derruba a ação */ }
        };
        try {
          const r = await t.exec(i, ctx);
          await audit(r.ok ? "ok" : "error");
          return { ...r, output: cut(r.output) };
        } catch (e) {
          const msg = e instanceof NotConnectedError || e instanceof GoogleApiError ? e.message : "Falha ao falar com o Google";
          await audit("error", { error: msg });
          return fail(cut(msg, 300));
        }
      },
    };
  }

  registry.register(def({
    name: "gmail_search", sideEffect: false,
    description: "Busca e-mails no Gmail do usuário (sintaxe de busca do Gmail). Retorna remetente, assunto, data e trecho.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "ex.: from:ana is:unread newer_than:7d" }, maxResults: { type: "integer", minimum: 1, maximum: 10 } }, required: ["query"] },
    schema: z.object({ query: z.string().min(1).max(300), maxResults: z.number().int().min(1).max(10).optional() }),
    async exec(i, ctx) {
      const r = await gmail.search(ctx.userId, i.query, i.maxResults ?? 5);
      return { ok: true, output: r.length ? r.map(line).join("\n") : "Nenhum e-mail encontrado.", data: r };
    },
  }));

  registry.register(def({
    name: "gmail_read", sideEffect: false,
    description: "Lê cabeçalhos e trecho de um e-mail pelo id retornado em gmail_search.",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    schema: z.object({ id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/) }),
    async exec(i, ctx) {
      const m = await gmail.read(ctx.userId, i.id);
      return { ok: true, output: `De: ${m.from}\nPara: ${m.to}\nAssunto: ${m.subject}\nData: ${m.date}\n${m.snippet}`, data: m };
    },
  }));

  const mailSchema = z.object({ to: emails, subject: z.string().min(1).max(200), body: z.string().min(1).max(20000), cc: emails.optional() });
  const mailInput = { type: "object", properties: { to: { type: "array", items: { type: "string" }, description: "destinatários (e-mails)" }, subject: { type: "string" }, body: { type: "string" }, cc: { type: "array", items: { type: "string" } } }, required: ["to", "subject", "body"] };

  registry.register(def({
    name: "gmail_draft", sideEffect: false,
    description: "Cria um rascunho no Gmail (NÃO envia).", inputSchema: mailInput, schema: mailSchema,
    audit: (i) => ({ to: i.to, subject: i.subject }),
    async exec(i, ctx) {
      const r = await gmail.draft(ctx.userId, i);
      return { ok: true, output: `Rascunho criado (id ${r.id}) para ${i.to.join(", ")}.`, data: r };
    },
  }));

  registry.register(def({
    name: "gmail_send", sideEffect: true,
    description: "Envia um e-mail. Exige confirmação explícita do usuário.", inputSchema: mailInput, schema: mailSchema,
    confirmSummary: (i) => `Enviar e-mail para ${i.to.join(", ")}: ${i.subject}`,
    audit: (i) => ({ to: i.to, subject: i.subject }),
    async exec(i, ctx) {
      const r = await gmail.send(ctx.userId, i);
      return { ok: true, output: `E-mail enviado para ${i.to.join(", ")} (id ${r.id}).`, data: r };
    },
  }));

  const range = z.object({ timeMin: iso, timeMax: iso, maxResults: z.number().int().min(1).max(50).optional() });
  registry.register(def({
    name: "calendar_list", sideEffect: false,
    description: "Lista eventos do calendário principal num intervalo (datas ISO-8601 com fuso).",
    inputSchema: { type: "object", properties: { timeMin: { type: "string", description: "ISO-8601" }, timeMax: { type: "string", description: "ISO-8601" }, maxResults: { type: "integer", minimum: 1, maximum: 50 } }, required: ["timeMin", "timeMax"] },
    schema: range,
    async exec(i, ctx) {
      const r = await cal.list(ctx.userId, i.timeMin, i.timeMax, i.maxResults ?? 20);
      return { ok: true, output: r.length ? r.map((e) => `[${e.id}] ${e.start} → ${e.end} | ${e.summary}${e.location ? ` @ ${e.location}` : ""}`).join("\n") : "Nenhum evento no período.", data: r };
    },
  }));

  registry.register(def({
    name: "calendar_create_event", sideEffect: true,
    description: "Cria um evento no calendário principal. Exige confirmação explícita do usuário.",
    inputSchema: { type: "object", properties: { summary: { type: "string" }, start: { type: "string", description: "ISO-8601" }, end: { type: "string", description: "ISO-8601" }, description: { type: "string" }, location: { type: "string" }, attendees: { type: "array", items: { type: "string" } }, timeZone: { type: "string", description: "IANA, ex.: America/Sao_Paulo" } }, required: ["summary", "start", "end"] },
    schema: z.object({ summary: z.string().min(1).max(200), start: iso, end: iso, description: z.string().max(2000).optional(), location: z.string().max(200).optional(), attendees: z.array(email).max(20).optional(), timeZone: z.string().max(64).optional() })
      .refine((v) => Date.parse(v.end) > Date.parse(v.start), "end deve ser depois de start"),
    confirmSummary: (i) => `Criar evento "${i.summary}" em ${i.start}`,
    audit: (i) => ({ summary: i.summary, start: i.start, end: i.end }),
    async exec(i, ctx) {
      const e = await cal.create(ctx.userId, i);
      return { ok: true, output: `Evento criado: [${e.id}] ${e.summary} ${e.start} → ${e.end}`, data: e };
    },
  }));
}
