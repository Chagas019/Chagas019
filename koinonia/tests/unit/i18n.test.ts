import { describe, expect, it } from "vitest";
import { localizedName, messagesFor, t } from "@/i18n/format";
import { describeNotification } from "@/features/notifications/format";
import { dbErrorMessage, resolveMessage } from "@/lib/errors";

describe("i18n", () => {
  it("interpola variáveis", () => {
    expect(t("Olá, {name}! {missing}", { name: "Ana" })).toBe("Olá, Ana! {missing}");
  });
  it("faz fallback para pt-BR em chaves não traduzidas", () => {
    const en = messagesFor("en");
    expect(en.nav.opportunities).toBe("Opportunities");
    expect(en.profile.editTitle).toBe(messagesFor("pt-BR").profile.editTitle);
  });
  it("nomes do catálogo com fallback", () => {
    expect(localizedName({ "pt-BR": "Canto", en: "Singing" }, "en")).toBe("Singing");
    expect(localizedName({ "pt-BR": "Canto" }, "es")).toBe("Canto");
  });
  it("resolve chaves de validação", () => {
    expect(resolveMessage(messagesFor("pt-BR"), "validation.tooLong", { max: 80 })).toBe("Texto longo demais (máximo 80 caracteres).");
    expect(resolveMessage(messagesFor("pt-BR"), "nao.existe")).toBe("nao.existe");
  });
});

describe("mensagens de erro do banco", () => {
  const m = messagesFor("pt-BR");
  it.each([
    [{ code: "P0429", message: "rate_limited" }, m.errors.rateLimited],
    [{ code: "42501", message: "community must be verified to publish opportunities" }, m.errors.communityNotVerified],
    [{ code: "42501", message: "new row violates row-level security policy" }, m.errors.forbidden],
    [{ code: "23505", message: "duplicate key value violates unique constraint \"communities_slug_key\"" }, m.errors.slugTaken],
    [{ code: "23514", message: "opportunity is not open" }, m.errors.opportunityClosed],
  ])("%o", (err, expected) => {
    expect(dbErrorMessage(err, m)).toBe(expected);
  });
  it("não vaza detalhes internos em erros desconhecidos", () => {
    const original = console.error;
    console.error = () => undefined;
    expect(dbErrorMessage({ code: "XX000", message: "internal: relation secret_table" }, m)).toBe(m.errors.generic);
    console.error = original;
  });
});

describe("notificações", () => {
  const m = messagesFor("pt-BR");
  it("descreve e cria link seguro", () => {
    const d = describeNotification({ id: "1", kind: "application.accepted", payload: { opportunity_id: "30000000-0000-0000-0000-000000000001", opportunity_title: "Coral" }, read_at: null, created_at: "" }, m);
    expect(d.text).toBe("Sua candidatura em “Coral” foi aceita!");
    expect(d.href).toBe("/oportunidades/30000000-0000-0000-0000-000000000001");
  });
  it("ignora payload malicioso no link", () => {
    const d = describeNotification({ id: "1", kind: "application.accepted", payload: { opportunity_id: "javascript:alert(1)" }, read_at: null, created_at: "" }, m);
    expect(d.href).toBeNull();
  });
  it("usa fallback para tipos desconhecidos", () => {
    expect(describeNotification({ id: "1", kind: "x.y", payload: {}, read_at: null, created_at: "" }, m).text).toBe(m.notifications.fallback);
  });
});
