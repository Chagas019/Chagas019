import { beforeEach, describe, expect, it } from "vitest";
import { applyToListing, createListing, decideApplication, getListing, listApplications, listListings } from "@/server/services/collab";
import { setBlock } from "@/server/services/social";
import { makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

const base = {
  title: "Videomaker procura editor",
  description: "Clipe de 3 minutos, entrega em duas semanas.",
  skills: ["Edição de vídeo"],
  projectType: "video",
  compensation: "R$ 1.200",
  mode: "remoto",
  contact: "editor@exemplo.com",
};

describe("Collab", () => {
  it("valida remuneração/voluntariado e localização no presencial", async () => {
    const ana = await makeUser("Ana");
    await expect(createListing(ana, { ...base, compensation: "" })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createListing(ana, { ...base, mode: "presencial" })).rejects.toMatchObject({ code: "VALIDATION" });
    await createListing(ana, { ...base, compensation: "", isVolunteer: true });
  });

  it("contato fica protegido até a candidatura ser aceita", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const l = await createListing(ana, base);
    expect((await getListing(bruno, l.id))!.contact).toBeNull();
    expect((await getListing(null, l.id))!.contact).toBeNull();
    expect(JSON.stringify(await listListings(null, {}))).not.toContain("editor@exemplo.com");

    const app = await applyToListing(bruno, { listingId: l.id, message: "Edito clipes há 4 anos." });
    await expect(applyToListing(bruno, { listingId: l.id, message: "de novo" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(applyToListing(ana, { listingId: l.id, message: "eu mesma" })).rejects.toMatchObject({ code: "VALIDATION" });
    expect((await getListing(bruno, l.id))!.contact).toBeNull();

    await expect(decideApplication(bruno, app.id, "accepted")).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listApplications(bruno, l.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await decideApplication(ana, app.id, "accepted");
    expect((await getListing(bruno, l.id))!.contact).toBe("editor@exemplo.com");
  });

  it("oportunidade privada só por link com código e fora da listagem", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const l = await createListing(ana, { ...base, access: "private" });
    expect((await listListings(bruno.id, {})).map((x) => x.id)).not.toContain(l.id);
    expect(await getListing(bruno, l.id)).toBeNull();
    expect(await getListing(bruno, l.id, "codigo-errado")).toBeNull();
    expect(await getListing(bruno, l.id, l.accessCode)).not.toBeNull();
    await expect(applyToListing(bruno, { listingId: l.id, message: "oi" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await applyToListing(bruno, { listingId: l.id, message: "oi" }, l.accessCode);
    // Depois de candidatar-se, continua vendo sem o código.
    expect(await getListing(bruno, l.id)).not.toBeNull();
  });

  it("bloqueio esconde a oportunidade", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const l = await createListing(ana, base);
    await setBlock(ana, bruno.id, true);
    expect(await getListing(bruno, l.id)).toBeNull();
    expect((await listListings(bruno.id, {})).map((x) => x.id)).not.toContain(l.id);
  });
});
