import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32, hashString } from '../js/prng.js';
import { buildCatalog, CATEGORIES, filterByCategory, searchCatalog, normalize } from '../js/catalog.js';

test('o gerador é determinístico', () => {
  const a = mulberry32(123), b = mulberry32(123);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  const r = mulberry32(7);
  for (let i = 0; i < 1000; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
  assert.equal(hashString('nature'), hashString('nature'));
  assert.notEqual(hashString('nature'), hashString('abstract'));
});

test('catálogo: 24 por categoria, ids únicos e estáveis', () => {
  const items = buildCatalog(24);
  assert.equal(items.length, 24 * CATEGORIES.length);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length);
  assert.deepEqual(buildCatalog(24), items);
  for (const c of CATEGORIES) assert.equal(filterByCategory(items, c.id).length, 24);
  assert.equal(filterByCategory(items, 'all').length, items.length);
  assert.notEqual(items[0].category, items[1].category, 'feed intercalado');
});

test('busca ignora acentos e maiúsculas e exige todos os termos', () => {
  const items = buildCatalog(24);
  assert.equal(normalize('Pôr do SOL'), 'por do sol');
  assert.equal(searchCatalog(items, 'por do sol').length, 24);
  assert.equal(searchCatalog(items, 'ARQUITETURA').length, 24);
  assert.equal(searchCatalog(items, 'praia arcos').length, 0);
  assert.equal(searchCatalog(items, '   ').length, 0);
  assert.equal(searchCatalog(items, '<script>').length, 0);
});
