// Testes de integração do MAILBOT no Floot. Rodar com a ferramenta run_code_in_vm do Floot
// (o ambiente do projeto tem superjson e acesso à API). Cria 2 usuários de teste no banco de desenvolvimento.
import superjson from "superjson";
const B = "https://92a17f09-27cb-4fe9-88c9-f9409ff82bf9.sandbox.floot.app/_api";
const out = [];
const ok = (name, cond, extra = "") => out.push(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`);
async function call(path, { method = "GET", body, cookie } = {}) {
  const r = await fetch(B + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body ? superjson.stringify(body) : undefined });
  const t = await r.text();
  let j; try { j = superjson.parse(t); } catch { j = t.slice(0, 200); }
  return { s: r.status, j, setCookie: r.headers.getSetCookie?.() ?? [] };
}
const tag = Date.now().toString(36);
async function reg(n) {
  const r = await call("/auth/register_with_password", { method: "POST", body: { email: `mbtest-${n}-${tag}@example.com`, password: "Teste-12345", displayName: `Teste ${n}` } });
  return { r, cookie: r.setCookie.map((c) => c.split(";")[0]).join("; ") };
}
for (const p of ["/mailbot/status", "/mailbot/usage"]) { const r = await call(p); ok(`401 sem login ${p}`, r.s === 401, r.s); }
for (const p of ["/mailbot/chat", "/mailbot/sync", "/mailbot/emails", "/__dev/ai_probe"]) { const r = await call(p, { method: "POST", body: { message: "oi" } }); ok(`401 sem login ${p}`, r.s === 401, r.s); }
const A = await reg("a"), Bu = await reg("b");
ok("cadastro A", A.r.s === 200 && A.cookie, A.r.s);
ok("cadastro B", Bu.r.s === 200 && Bu.cookie, Bu.r.s);
const dup = await call("/auth/register_with_password", { method: "POST", body: { email: `MBTEST-a-${tag}@example.com`, password: "Teste-12345", displayName: "x" } });
ok("e-mail duplicado recusado", dup.s === 409, dup.s);
const sa = await call("/mailbot/status", { cookie: A.cookie }), sb = await call("/mailbot/status", { cookie: Bu.cookie });
ok("status A", sa.s === 200 && sa.j.name === "Teste a");
ok("status B isolado", sb.s === 200 && sb.j.name === "Teste b" && sb.j.stats.analyzed === 0);
const ca = await call("/mailbot/chat", { method: "POST", cookie: A.cookie, body: { message: "Quais e-mails estão aguardando resposta?" } });
ok("chat determinístico sem IA", ca.s === 200 && ca.j.usedAi === false, ca.s);
const cb = await call("/mailbot/chat", { method: "POST", cookie: Bu.cookie, body: { conversationId: ca.j.conversationId, message: "Quais e-mails estão aguardando resposta?" } });
ok("B não usa conversa de A", cb.s !== 200 || cb.j.conversationId !== ca.j.conversationId, cb.s);
const ua = await call("/mailbot/usage", { cookie: A.cookie });
ok("uso A", ua.s === 200);
const probe = await call("/__dev/ai_probe", { method: "POST", cookie: A.cookie });
out.push("ai_probe: " + JSON.stringify({ s: probe.s, j: probe.j }));
const ua2 = await call("/mailbot/usage", { cookie: A.cookie }), ub2 = await call("/mailbot/usage", { cookie: Bu.cookie });
ok("consumo registrado só para A", JSON.stringify(ua2.j) !== JSON.stringify(ua.j) && ub2.j.today === 0);
await call("/auth/logout", { method: "POST", cookie: A.cookie });
const after = await call("/mailbot/status", { cookie: A.cookie });
ok("sessão inválida após logout", after.s === 401, after.s);
console.log(out.join("\n"));
