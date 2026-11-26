import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyOutline, verifyCatechism, verifyBible, verifySaint } from "../../src/lib/ai/verify";
import { buildTemplateOutline } from "../../src/lib/ai/template";
import { BriefSchema } from "../../src/lib/ai/schema";

const brief = BriefSchema.parse({ tema: "O perdão que liberta" });

test("referências bíblicas inexistentes ficam não verificadas", () => {
  assert.equal(verifyBible("Lc 15,11-32", "").status, "verificada");
  assert.equal(verifyBible("Lc 40,1", "").status, "nao-verificada");
  assert.equal(verifyBible("Jo 3,999", "").status, "nao-verificada");
  assert.equal(verifyBible("Jo 3,16", "").status, "capitulo"); // capítulo conferido, versículo não
  assert.equal(verifyBible("Jo 3", "").status, "verificada");
});

test("Catecismo: faixa conhecida x desconhecida x inválida", () => {
  assert.equal(verifyCatechism("2840", "").status, "verificada");
  assert.equal(verifyCatechism("10-12", "").status, "nao-verificada");
  assert.equal(verifyCatechism("9999", "").status, "nao-verificada");
});

test("santos do calendário", () => {
  assert.equal(verifySaint("Santa Teresinha do Menino Jesus", "").status, "verificada");
  assert.equal(verifySaint("São Fulano Inventado", "").status, "nao-verificada");
  for (const vago of ["", "Santo", "Santa", "Fulano"]) assert.equal(verifySaint(vago, "").status, "nao-verificada", vago);
  assert.equal(verifySaint("São Tomás de Aquino", "").status, "verificada");
  assert.match(verifySaint("Maria", "").detail ?? "", /Virgem Maria/);
  assert.equal(verifySaint("São Tiago", "").status, "verificada"); // "São Filipe e São Tiago"
  assert.match(verifySaint("São Paulo", "").detail ?? "", /Pedro e São Paulo/);
});

test("documentos e músicas fora do catálogo são removidos com aviso", () => {
  const o = verifyOutline({
    titulo: "t", titulos_alternativos: [], objetivo_central: "", introducao: "", contextualizacao: "", conclusao: "",
    fundamentacao_biblica: [{ referencia: "Mt 18,21-35", por_que: "" }], desenvolvimento: [], catecismo: [],
    documentos: [{ id: "dives-in-misericordia", como_usar: "" }, { id: "documento-inventado", como_usar: "" }],
    santos: [], aplicacoes_praticas: [], perguntas_reflexao: [],
    musicas: [{ id: "abraco-de-pai", momento: "", por_que: "" }, { id: "musica-fake", momento: "", por_que: "" }],
    avisos: [],
  }, brief, "teste");
  assert.equal(o.documentos.length, 1);
  assert.ok(o.documentos[0].url?.includes("vatican.va"));
  assert.equal(o.musicas.length, 1);
  assert.ok(o.avisos.some((a) => a.includes("documento-inventado")));
  assert.ok(o.avisos.some((a) => a.includes("musica-fake")));
});

test("roteiro-base sem IA usa só o catálogo", () => {
  const o = buildTemplateOutline({ ...brief, passagem: "Mt 18,21-35" });
  assert.equal(o.fundamentacao_biblica[0].label, "Mt 18,21-35");
  assert.ok(o.musicas.length > 0 && o.musicas.every((m) => m.url?.startsWith("https://open.spotify.com/")));
  assert.ok(o.avisos.some((a) => a.includes("767")));
});
