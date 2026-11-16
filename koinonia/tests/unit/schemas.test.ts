import { describe, expect, it } from "vitest";
import { signupSchema, loginSchema } from "@/schemas/auth";
import { onboardingSchema } from "@/schemas/profile";
import { communitySchema } from "@/schemas/community";
import { opportunitySchema } from "@/schemas/opportunity";
import { formToObject } from "@/schemas/common";

const validSignup = { displayName: "Ana", email: "ANA@Example.com ", password: "frase-secreta-longa", confirmPassword: "frase-secreta-longa", acceptTerms: "on", acceptPrivacy: "on" };

describe("auth schemas", () => {
  it("normaliza e-mail", () => {
    const r = signupSchema.safeParse(validSignup);
    expect(r.success && r.data.email).toBe("ana@example.com");
  });
  it("exige consentimentos", () => {
    const r = signupSchema.safeParse({ ...validSignup, acceptPrivacy: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain("validation.acceptPrivacy");
  });
  it("exige senhas iguais e longas", () => {
    expect(signupSchema.safeParse({ ...validSignup, confirmPassword: "outra-coisa-longa" }).error?.issues[0]?.message).toBe("validation.passwordMatch");
    expect(signupSchema.safeParse({ ...validSignup, password: "curta", confirmPassword: "curta" }).success).toBe(false);
  });
  it("login rejeita e-mail inválido", () => {
    expect(loginSchema.safeParse({ email: "x", password: "y" }).success).toBe(false);
  });
});

describe("onboarding", () => {
  const base = { displayName: "Ana", bio: "", country: "br", city: "Campinas", languages: ["pt"], availability: ["weekends"], serviceModes: [], hoursPerWeek: "4", visibility: "members", messagePermission: "everyone" };
  it("aceita dados válidos e normaliza país", () => {
    const r = onboardingSchema.safeParse(base);
    expect(r.success && r.data.country).toBe("BR");
    expect(r.success && r.data.hoursPerWeek).toBe(4);
  });
  it("rejeita país e idioma inexistentes", () => {
    expect(onboardingSchema.safeParse({ ...base, country: "ZZ" }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, languages: ["xx"] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ ...base, languages: [] }).success).toBe(false);
  });
  it("remove caracteres de controle", () => {
    const r = onboardingSchema.safeParse({ ...base, bio: "  olá\u0000 mundo\u0007 " });
    expect(r.success && r.data.bio).toBe("olá mundo");
  });
});

describe("comunidade", () => {
  const base = { name: "Paróquia São José", slug: "paroquia-sao-jose", kind: "parish", description: "", country: "BR", city: "SP", diocese: "", website: "", languages: [], needs: "", focusCategories: [] };
  it("valida slug e URL https", () => {
    expect(communitySchema.safeParse(base).success).toBe(true);
    expect(communitySchema.safeParse({ ...base, slug: "Com Espaço" }).success).toBe(false);
    expect(communitySchema.safeParse({ ...base, website: "javascript:alert(1)" }).success).toBe(false);
    expect(communitySchema.safeParse({ ...base, website: "http://inseguro.org" }).success).toBe(false);
  });
});

describe("oportunidade", () => {
  const base = { title: "Músicos para a missa", description: "Precisamos de músicos para as missas de domingo.", mode: "onsite", country: "BR", city: "", languages: [], availability: [], skills: ["1", "2"], slots: "", startsAt: "", endsAt: "", publish: "open" };
  it("exige país para presencial e aceita remoto sem país", () => {
    expect(opportunitySchema.safeParse({ ...base, country: "" }).success).toBe(false);
    expect(opportunitySchema.safeParse({ ...base, mode: "remote", country: "" }).success).toBe(true);
  });
  it("valida datas", () => {
    expect(opportunitySchema.safeParse({ ...base, startsAt: "2026-12-10", endsAt: "2026-12-01" }).success).toBe(false);
  });
  it("converte talentos para números", () => {
    const r = opportunitySchema.safeParse(base);
    expect(r.success && r.data.skills).toEqual([1, 2]);
  });
});

describe("formToObject", () => {
  it("agrupa campos repetidos em arrays", () => {
    const fd = new FormData();
    fd.append("languages", "pt"); fd.append("languages", "es"); fd.append("name", "x");
    expect(formToObject(fd, ["languages", "availability"])).toEqual({ languages: ["pt", "es"], name: "x", availability: [] });
  });
});
