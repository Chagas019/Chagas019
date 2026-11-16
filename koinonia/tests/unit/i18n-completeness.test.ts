import { describe, expect, it } from "vitest";
import { ptBR } from "@/i18n/messages/pt-BR";
import { en } from "@/i18n/messages/en";
import { es } from "@/i18n/messages/es";

type Tree = { [k: string]: string | Tree };
function leaves(obj: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out.set(key, v);
    else for (const [kk, vv] of leaves(v, key)) out.set(kk, vv);
  }
  return out;
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const base = leaves(ptBR as unknown as Tree);

describe.each([["en", en], ["es", es]] as const)("dicionário %s", (_name, dict) => {
  const target = leaves(dict as unknown as Tree);
  it("tem todas as chaves do pt-BR", () => {
    expect([...base.keys()].filter((k) => !target.has(k))).toEqual([]);
  });
  it("preserva os placeholders", () => {
    const bad = [...base].filter(([k, v]) => target.has(k) && placeholders(v) !== placeholders(target.get(k) ?? ""));
    expect(bad.map(([k]) => k)).toEqual([]);
  });
});
