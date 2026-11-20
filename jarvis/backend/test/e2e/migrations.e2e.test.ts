import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const dir = join(import.meta.dirname, "../../../supabase/migrations");
const sql = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => readFileSync(join(dir, f), "utf8")).join("\n");
const tables = [...sql.matchAll(/create table if not exists (\w+)/gi)].map((m) => m[1]!);
// policies efetivas: processa create/drop em ordem (migrations posteriores removem/recriam policies)
const effective = new Map<string, { name: string; table: string; cmd: string }>();
for (const m of sql.matchAll(/(create policy (\w+) on (\w+) for (\w+))|(drop policy (?:if exists )?(\w+) on (\w+))/gi)) {
  if (m[1]) effective.set(`${m[3]}.${m[2]}`, { name: m[2]!, table: m[3]!, cmd: m[4]!.toLowerCase() });
  else effective.delete(`${m[7]}.${m[6]}`);
}
const policies = [...effective.values()];

describe("e2e revisão estática das migrations (RLS)", () => {
  it("toda tabela tem RLS habilitado", () => {
    expect(tables.length).toBeGreaterThanOrEqual(8);
    for (const t of tables) expect(sql, t).toMatch(new RegExp(`alter table ${t} enable row level security`, "i"));
  });

  it("integration_tokens não tem policy (apenas conexão de serviço); usage/audit são só leitura", () => {
    expect(policies.filter((p) => p.table === "integration_tokens")).toEqual([]);
    for (const t of ["usage_records", "audit_events"]) expect(policies.filter((p) => p.table === t).map((p) => p.cmd)).toEqual(["select"]);
  });

  it("policies comparam user_id com auth.uid() (sem using true)", () => {
    expect(sql).not.toMatch(/using\s*\(\s*true\s*\)/i);
    expect(sql).toContain("auth.uid()::text");
  });

  // ACHADO F-01 (média): messages/tasks/memories/conversations têm `for all` para `authenticated`: o cliente pode escrever
  // direto via PostgREST (burlando rate limit/limites de corpo) e forjar messages.meta.pending (ação pendente).
  it("F-01: cliente só pode ler (somente select) em todas as tabelas; escrita só pelo backend", () => {
    for (const t of ["conversations", "messages", "memories", "tasks", "usage_records", "audit_events", "devices"]) {
      expect(policies.filter((p) => p.table === t).map((p) => p.cmd), t).toEqual(["select"]);
    }
  });
});
