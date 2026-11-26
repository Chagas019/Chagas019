import { test } from "node:test";
import assert from "node:assert/strict";
import { searchCatalog, matchThemes } from "../../src/lib/search";
import { parseReference, bibleChapterUrl, SOURCES, SONGS } from "../../src/data/catalog";

test("reconhece temas por sinônimos", () => {
  assert.ok(matchThemes("como perdoar quem me magoou").includes("perdao"));
  assert.ok(matchThemes("Nossa Senhora").includes("maria"));
  assert.deepEqual(matchThemes("Espírito Santo"), ["espirito-santo"]);
});

test("busca por tema traz várias categorias", () => {
  const { results } = searchCatalog("misericórdia");
  const cats = new Set(results.map((r) => r.category));
  for (const c of ["biblia", "musica", "documento", "catecismo"]) assert.ok(cats.has(c as never), c);
});

test("referência bíblica digitada", () => {
  const r = searchCatalog("Lc 15,11-32");
  assert.equal(r.reference?.title, "Lc 15,11-32");
  assert.ok(r.results.every((x) => x.category === "biblia"));
});

test("parser de referências", () => {
  assert.equal(parseReference("Jo 3,16")?.book.name, "João");
  assert.equal(parseReference("1Cor 13,1-13")?.chapter, 13);
  assert.equal(parseReference("Sl 51(50)")?.chapter, 51);
  assert.equal(parseReference("Mt 29,1"), null); // Mateus tem 28 capítulos
  assert.equal(parseReference("Xyz 1,1"), null);
});

test("links bíblicos só para livros verificados", () => {
  assert.match(bibleChapterUrl(parseReference("Lc 15")!) ?? "", /sao-lucas\/15\/$/);
  assert.equal(bibleChapterUrl(parseReference("Ab 1")!), null);
});

test("catálogo: links oficiais e faixas do Spotify", () => {
  for (const s of SOURCES) assert.match(s.url, /^https:\/\/(www\.|w2\.)?(vatican\.va|cnbb\.org\.br|repositorio\.celam\.org)\//, s.id);
  for (const s of SONGS) assert.match(s.spotifyUrl, /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]+$/, s.id);
  assert.equal(new Set(SONGS.map((s) => s.id)).size, SONGS.length);
});
