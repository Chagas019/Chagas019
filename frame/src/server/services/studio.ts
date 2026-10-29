import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { challengeSubmission, post, savedExample, savedItem, studioIdea, studioProject } from "../db/schema";
import { AppError } from "../errors";
import { enforceRateLimit } from "../rate-limit";
import { fieldErrors, ideaProposalSchema, studioProjectCreateSchema, studioProjectSchema } from "@/lib/validation";
import { getExample } from "@/lib/creative/examples";
import { canViewPost } from "./access";

const MAX_PROJECTS = 200;
const MAX_IDEAS = 300;

function parse<T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: import("zod").ZodError } }, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError("VALIDATION", undefined, fieldErrors(r.error));
  return r.data;
}

/* Projetos */

export async function createProject(ownerId: string, input: unknown) {
  const data = parse(studioProjectCreateSchema, input);
  await enforceRateLimit(`studio-project:${ownerId}`, 30, 3600);
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(studioProject).where(eq(studioProject.ownerId, ownerId));
  if ((c?.n ?? 0) >= MAX_PROJECTS) throw new AppError("VALIDATION", "Limite de projetos atingido. Conclua ou apague alguns.");
  if (data.sourceType === "example" && (!data.sourceRef || !getExample(data.sourceRef))) throw new AppError("VALIDATION", "Exemplo não encontrado.");
  if (data.sourceType === "post") {
    // Só referências que a pessoa consegue ver.
    const [ref] = data.sourceRef && /^[0-9a-f-]{36}$/i.test(data.sourceRef) ? await db.select().from(post).where(eq(post.id, data.sourceRef)).limit(1) : [];
    if (!ref || !(await canViewPost({ id: ownerId, role: "user" }, ref))) throw new AppError("NOT_FOUND");
  }
  const [p] = await db.insert(studioProject).values({ ownerId, ...data }).returning({ id: studioProject.id });
  return p!;
}

async function ownProject(ownerId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND");
  const [p] = await db.select().from(studioProject).where(eq(studioProject.id, id)).limit(1);
  // Projetos são privados: quem não é dono recebe "não encontrado".
  if (!p || p.ownerId !== ownerId) throw new AppError("NOT_FOUND");
  return p;
}

export async function getProject(ownerId: string, id: string) {
  return ownProject(ownerId, id).catch(() => null);
}

export async function updateProject(ownerId: string, id: string, input: unknown) {
  await ownProject(ownerId, id);
  const data = parse(studioProjectSchema, input);
  await db.update(studioProject).set(data).where(eq(studioProject.id, id));
}

export async function deleteProject(ownerId: string, id: string) {
  await ownProject(ownerId, id);
  await db.delete(studioProject).where(eq(studioProject.id, id));
}

/** Liga o projeto à publicação feita a partir dele (só posts do próprio dono). */
export async function linkProjectPost(ownerId: string, id: string, postId: string) {
  await ownProject(ownerId, id);
  const [p] = await db.select({ authorId: post.authorId }).from(post).where(eq(post.id, postId)).limit(1);
  if (!p || p.authorId !== ownerId) throw new AppError("FORBIDDEN");
  await db.update(studioProject).set({ publishedPostId: postId, status: "pronto" }).where(eq(studioProject.id, id));
}

export async function listProjects(ownerId: string) {
  return db.select().from(studioProject).where(eq(studioProject.ownerId, ownerId)).orderBy(desc(studioProject.updatedAt)).limit(MAX_PROJECTS);
}

/* Ideias */

export async function saveIdea(ownerId: string, input: unknown) {
  const proposal = parse(ideaProposalSchema, input);
  await enforceRateLimit(`studio-idea:${ownerId}`, 60, 3600);
  const [c] = await db.select({ n: sql<number>`count(*)::int` }).from(studioIdea).where(eq(studioIdea.ownerId, ownerId));
  if ((c?.n ?? 0) >= MAX_IDEAS) throw new AppError("VALIDATION", "Limite de ideias salvas atingido. Apague algumas antigas.");
  const [i] = await db.insert(studioIdea).values({ ownerId, title: proposal.title, proposal }).returning({ id: studioIdea.id });
  return i!;
}

export async function listIdeas(ownerId: string) {
  return db.select().from(studioIdea).where(eq(studioIdea.ownerId, ownerId)).orderBy(desc(studioIdea.createdAt)).limit(MAX_IDEAS);
}

export async function deleteIdea(ownerId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new AppError("NOT_FOUND");
  const r = await db.delete(studioIdea).where(and(eq(studioIdea.id, id), eq(studioIdea.ownerId, ownerId))).returning({ id: studioIdea.id });
  if (!r.length) throw new AppError("NOT_FOUND");
}

/** Transforma uma ideia salva em projeto com as etapas como tarefas. */
export async function projectFromIdea(ownerId: string, ideaId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(ideaId)) throw new AppError("NOT_FOUND");
  const [i] = await db.select().from(studioIdea).where(and(eq(studioIdea.id, ideaId), eq(studioIdea.ownerId, ownerId))).limit(1);
  if (!i) throw new AppError("NOT_FOUND");
  const p = i.proposal;
  return createProject(ownerId, {
    title: i.title,
    description: [p.concept, `Referência visual: ${p.visualReference}`, `Enquadramento: ${p.framing}`, `Edição: ${p.editing}`, `Legenda: ${p.caption}`, `Chamada: ${p.cta}`].join("\n\n"),
    tasks: p.structure.slice(0, 50).map((text, n) => ({ id: `t${n + 1}`, text: text.slice(0, 200), done: false })),
    sourceType: "idea",
    sourceRef: i.id,
  });
}

/* Exemplos do laboratório */

export async function toggleSavedExample(userId: string, slug: string) {
  if (!getExample(slug)) throw new AppError("NOT_FOUND");
  const inserted = await db.insert(savedExample).values({ userId, slug }).onConflictDoNothing().returning({ slug: savedExample.slug });
  if (inserted.length) return { saved: true };
  await db.delete(savedExample).where(and(eq(savedExample.userId, userId), eq(savedExample.slug, slug)));
  return { saved: false };
}

export async function savedExampleSlugs(userId: string): Promise<string[]> {
  return (await db.select({ slug: savedExample.slug }).from(savedExample).where(eq(savedExample.userId, userId)).orderBy(desc(savedExample.createdAt))).map((r) => r.slug);
}

/* Conquistas — calculadas de dados reais, sem ranking entre pessoas. */

export type Achievement = { id: string; title: string; description: string; earned: boolean; progress: string };

export async function achievements(userId: string): Promise<Achievement[]> {
  const [s] = await db.execute<{ posts: number; showcases: number; challenges: number; daily: number; projects_done: number; saves: number; ideas: number }>(sql`
    select
      (select count(*)::int from post where author_id = ${userId} and status = 'published') as posts,
      (select count(*)::int from post where author_id = ${userId} and status = 'published' and kind = 'showcase') as showcases,
      (select count(*)::int from ${challengeSubmission} where user_id = ${userId}) as challenges,
      (select count(*)::int from post where author_id = ${userId} and status = 'published' and tags @> array['desafiodiario']::text[]) as daily,
      (select count(*)::int from studio_project where owner_id = ${userId} and status = 'pronto') as projects_done,
      (select count(*)::int from ${savedItem} where user_id = ${userId}) as saves,
      (select count(*)::int from studio_idea where owner_id = ${userId}) as ideas`);
  const v = { posts: 0, showcases: 0, challenges: 0, daily: 0, projects_done: 0, saves: 0, ideas: 0, ...s };
  const a = (id: string, title: string, description: string, have: number, need: number): Achievement => ({
    id,
    title,
    description,
    earned: have >= need,
    progress: `${Math.min(have, need)}/${need}`,
  });
  return [
    a("primeiro-quadro", "Primeiro quadro", "Publicou o primeiro trabalho.", v.posts, 1),
    a("serie", "Série", "Publicou 10 trabalhos.", v.posts, 10),
    a("bastidores", "Bastidores", "Mostrou o processo em um Showcase.", v.showcases, 1),
    a("ritmo", "Ritmo diário", "Participou de 5 desafios do dia.", v.daily, 5),
    a("na-arena", "Na roda", "Participou de um Creative Battle.", v.challenges, 1),
    a("do-papel", "Do papel ao feed", "Concluiu um projeto no estúdio.", v.projects_done, 1),
    a("curadoria", "Curadoria", "Salvou 20 referências.", v.saves, 20),
    a("caderno", "Caderno de ideias", "Guardou 5 ideias.", v.ideas, 5),
  ];
}

/** Participações em desafios do dia (qualquer visibilidade — privadas contam só para a própria pessoa). */
export async function dailyHistory(userId: string, limit = 30) {
  return db
    .select({ id: post.id, title: post.title, tags: post.tags, visibility: post.visibility, createdAt: post.createdAt })
    .from(post)
    .where(and(eq(post.authorId, userId), eq(post.status, "published"), sql`${post.tags} @> array['desafiodiario']::text[]`))
    .orderBy(desc(post.createdAt))
    .limit(limit);
}

/** Quantas pessoas participaram publicamente do tema de hoje (contagem real). */
export async function dailyPublicCount(tag: string): Promise<number> {
  const [r] = await db.execute<{ n: number }>(sql`
    select count(distinct author_id)::int as n from post
    where status = 'published' and visibility = 'public'
      and tags @> array['desafiodiario', ${tag}]::text[]
      and created_at > now() - interval '36 hours'`);
  return Number(r?.n ?? 0);
}
