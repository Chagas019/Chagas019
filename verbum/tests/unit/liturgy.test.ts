import { test } from "node:test";
import assert from "node:assert/strict";
import { easter, adventStart, liturgicalDay } from "../../src/lib/liturgy";

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

test("data da Páscoa (computus gregoriano)", () => {
  assert.equal(iso(easter(2024)), "2024-03-31");
  assert.equal(iso(easter(2025)), "2025-04-20");
  assert.equal(iso(easter(2026)), "2026-04-05");
  assert.equal(iso(easter(2027)), "2027-03-28");
});

test("início do Advento", () => {
  assert.equal(iso(adventStart(2025)), "2025-11-30");
  assert.equal(iso(adventStart(2026)), "2026-11-29");
});

test("ciclos A/B/C e I/II", () => {
  assert.equal(liturgicalDay("2026-11-26").sundayCycle, "A");
  assert.equal(liturgicalDay("2026-11-29").sundayCycle, "B");
  assert.equal(liturgicalDay("2026-06-10").weekdayCycle, "II");
  assert.equal(liturgicalDay("2027-06-10").weekdayCycle, "I");
});

test("tempos e celebrações principais", () => {
  assert.equal(liturgicalDay("2026-11-29").weekLabel, "1º Domingo do Advento");
  assert.equal(liturgicalDay("2026-11-22").celebration, "Nosso Senhor Jesus Cristo, Rei do Universo");
  assert.equal(liturgicalDay("2026-02-18").celebration, "Quarta-feira de Cinzas");
  assert.equal(liturgicalDay("2026-05-24").color, "vermelho"); // Pentecostes
  assert.equal(liturgicalDay("2026-10-12").rank, "S"); // Aparecida
  assert.equal(liturgicalDay("2026-12-13").color, "rosa"); // Gaudete
  assert.equal(liturgicalDay("2027-01-17").weekLabel, "2º Domingo do Tempo Comum");
});

test("transferências próprias do Brasil", () => {
  assert.equal(liturgicalDay("2026-05-17").celebration, "Ascensão do Senhor"); // domingo
  assert.equal(liturgicalDay("2026-08-16").celebration, "Assunção de Nossa Senhora");
  assert.equal(liturgicalDay("2026-06-29").celebration, null); // transferida para 05/07
  assert.equal(liturgicalDay("2026-07-05").celebration, "São Pedro e São Paulo, apóstolos");
});

test("memória cede ao domingo", () => {
  // 22/11/2026 é domingo (Cristo Rei): Santa Cecília não aparece
  assert.ok(!liturgicalDay("2026-11-22").memorials.some((m) => m.includes("Cecília")));
});
