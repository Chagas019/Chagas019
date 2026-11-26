import { describe, expect, it } from "vitest";
import { decideAccess } from "@/lib/services/access";

const ctx = (o: Partial<Parameters<typeof decideAccess>[1]> = {}) => ({ loggedIn: true, isAdmin: false, owns: false, hasActiveSubscription: false, ...o });
const P = (access_mode: Parameters<typeof decideAccess>[0]["access_mode"], status: "published" | "draft" = "published") => ({ access_mode, status });

describe("decideAccess", () => {
  it("exige login até para gratuitos", () => {
    expect(decideAccess(P("free"), ctx({ loggedIn: false }))).toEqual({ allowed: false, reason: "login_required" });
    expect(decideAccess(P("free"), ctx()).allowed).toBe(true);
  });
  it("premium sem compra nem assinatura é bloqueado", () => {
    expect(decideAccess(P("purchase_or_subscription"), ctx()).reason).toBe("purchase_or_subscription_required");
    expect(decideAccess(P("purchase_only"), ctx()).reason).toBe("purchase_required");
    expect(decideAccess(P("subscription_only"), ctx()).reason).toBe("subscription_required");
  });
  it("compra libera purchase_*; não libera subscription_only", () => {
    expect(decideAccess(P("purchase_or_subscription"), ctx({ owns: true })).reason).toBe("owned");
    expect(decideAccess(P("purchase_only"), ctx({ owns: true })).reason).toBe("owned");
    expect(decideAccess(P("subscription_only"), ctx({ owns: true })).allowed).toBe(false);
  });
  it("assinatura libera *_subscription; não libera purchase_only", () => {
    expect(decideAccess(P("purchase_or_subscription"), ctx({ hasActiveSubscription: true })).reason).toBe("subscription");
    expect(decideAccess(P("subscription_only"), ctx({ hasActiveSubscription: true })).reason).toBe("subscription");
    expect(decideAccess(P("purchase_only"), ctx({ hasActiveSubscription: true })).allowed).toBe(false);
  });
  it("rascunho só para admin", () => {
    expect(decideAccess(P("free", "draft"), ctx()).reason).toBe("unavailable");
    expect(decideAccess(P("purchase_only", "draft"), ctx({ isAdmin: true })).reason).toBe("admin");
  });
});
