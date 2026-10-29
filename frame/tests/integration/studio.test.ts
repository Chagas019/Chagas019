import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db";
import { studioProject } from "@/server/db/schema";
import {
  achievements,
  createProject,
  dailyHistory,
  deleteProject,
  getProject,
  linkProjectPost,
  listProjects,
  projectFromIdea,
  saveIdea,
  toggleSavedExample,
  updateProject,
} from "@/server/services/studio";
import { exportUserData } from "@/server/services/privacy";
import { generateIdea } from "@/lib/creative/ideas";
import { makePost, makeUser, resetDb } from "./helpers";

beforeEach(resetDb);

const idea = generateIdea({ kind: "foto", goal: "portfolio", style: "minimalista", platform: "feed", time: "2h" }, 11);

describe("Meu estúdio", () => {
  it("projetos são privados: outra pessoa não lê, edita nem apaga", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await createProject(ana.id, { title: "Ensaio na praia", tasks: [{ id: "a", text: "Escolher locação", done: false }] });
    expect(await getProject(bruno.id, p.id)).toBeNull();
    await expect(updateProject(bruno.id, p.id, { title: "x" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(deleteProject(bruno.id, p.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await updateProject(ana.id, p.id, { title: "Ensaio na praia", status: "producao", tasks: [{ id: "a", text: "Escolher locação", done: true }], links: [{ label: "Moodboard", url: "https://example.com/m" }] });
    const [row] = await db.select().from(studioProject).where(eq(studioProject.id, p.id));
    expect(row!.status).toBe("producao");
    expect(row!.tasks[0]!.done).toBe(true);
  });

  it("rejeita links que não são https e texto vazio", async () => {
    const ana = await makeUser("Ana");
    const p = await createProject(ana.id, { title: "P" });
    await expect(updateProject(ana.id, p.id, { title: "P", links: [{ label: "x", url: "javascript:alert(1)" }] })).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createProject(ana.id, { title: "  " })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("ideia salva vira projeto com as etapas como tarefas", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const i = await saveIdea(ana.id, idea);
    await expect(projectFromIdea(bruno.id, i.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const p = await projectFromIdea(ana.id, i.id);
    const [row] = await db.select().from(studioProject).where(eq(studioProject.id, p.id));
    expect(row!.tasks.map((t) => t.text)).toEqual(idea.structure);
    expect(row!.sourceType).toBe("idea");
  });

  it("referência do feed só vira projeto se a pessoa puder vê-la", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const pub = await makePost(ana);
    const priv = await makePost(ana, { visibility: "private" });
    await createProject(bruno.id, { title: "Inspirado", sourceType: "post", sourceRef: pub.id });
    await expect(createProject(bruno.id, { title: "Espião", sourceType: "post", sourceRef: priv.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("publicar a partir do projeto liga o post só se for da mesma pessoa", async () => {
    const ana = await makeUser("Ana");
    const bruno = await makeUser("Bruno");
    const p = await createProject(ana.id, { title: "P" });
    const brunoPost = await makePost(bruno);
    await expect(linkProjectPost(ana.id, p.id, brunoPost.id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const anaPost = await makePost(ana);
    await linkProjectPost(ana.id, p.id, anaPost.id);
    expect((await listProjects(ana.id))[0]!.status).toBe("pronto");
  });

  it("exemplos salvos, conquistas, desafio do dia privado e exportação LGPD", async () => {
    const ana = await makeUser("Ana");
    expect(await toggleSavedExample(ana.id, "retrato-cinematografico")).toEqual({ saved: true });
    await expect(toggleSavedExample(ana.id, "nao-existe")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await makePost(ana, { body: "#desafiodiario #reflexo", visibility: "private" });
    expect(await dailyHistory(ana.id)).toHaveLength(1);
    const a = await achievements(ana.id);
    expect(a.find((x) => x.id === "primeiro-quadro")?.earned).toBe(true);
    const data = await exportUserData(ana.id);
    expect(data.savedExamples).toHaveLength(1);
  });
});
