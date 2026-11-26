import { test } from "node:test";
import assert from "node:assert/strict";
import { safeRedirectPath } from "../../src/lib/redirect";

test("redirecionamento aceita só caminhos internos", () => {
  assert.equal(safeRedirectPath("/assistente?projeto=1"), "/assistente?projeto=1");
  for (const bad of ["//evil.com", "/\\evil.com", "/\t/evil.com", "https://evil.com", "javascript:alert(1)", "", null]) {
    assert.equal(safeRedirectPath(bad), "/painel", String(bad));
  }
});
