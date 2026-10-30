/**
 * DADOS DE DEMONSTRAÇÃO — apenas para desenvolvimento.
 * Cria contas @demo.frame.local, imagens abstratas geradas localmente (marcadas "DEMO"),
 * comunidades e desafios. Nunca rode em produção: o script se recusa se NODE_ENV=production.
 *
 * Uso: npm run db:seed
 */
import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { auth } from "../auth";
import { db } from "./index";
import { challenge, challengeSubmission, profile, user } from "./schema";
import { storeUpload } from "../services/media";
import { createPost } from "../services/posts";
import { setFollow, toggleLike, addComment } from "../services/social";
import { createCommunity, joinCommunity } from "../services/communities";

if (process.env.NODE_ENV === "production") {
  console.error("Seed de demonstração bloqueado em produção.");
  process.exit(1);
}

const PASSWORD = "demo-frame-2026";

const people = [
  { name: "Lia Moreira", email: "lia@demo.frame.local", handle: "lia.luz", specialties: ["Fotografia", "Edição de fotos"], interests: ["fotografia", "retrato", "color-grading"], bio: "[Demo] Retratos com luz natural em São Luís." },
  { name: "Caio Bastos", email: "caio@demo.frame.local", handle: "caio.frames", specialties: ["Videomaker", "Colorista"], interests: ["video", "color-grading", "edicao"], bio: "[Demo] Curtas, clipes e color grading." },
  { name: "Nanda Reis", email: "nanda@demo.frame.local", handle: "nanda.mobile", specialties: ["Fotografia", "Aprendendo"], interests: ["mobile", "street", "fotografia"], bio: "[Demo] Fotografia de rua só com o celular." },
  { name: "Theo Lima", email: "theo@demo.frame.local", handle: "theo.motion", specialties: ["Motion design", "Design gráfico"], interests: ["motion", "design", "arte-digital"], bio: "[Demo] Motion e tipografia cinética." },
  { name: "Bia Santos", email: "bia@demo.frame.local", handle: "bia.eventos", specialties: ["Fotografia", "Edição de vídeo"], interests: ["eventos", "retrato", "video"], bio: "[Demo] Casamentos e eventos no interior de MG." },
  { name: "Admin FRAME", email: "admin@demo.frame.local", handle: "frame.equipe", specialties: [], interests: ["fotografia", "video"], bio: "[Demo] Conta de administração de demonstração." },
];

const palettes = [
  ["#1b1035", "#7c3aed", "#f59e0b"],
  ["#0b1a2e", "#3b82f6", "#5eead4"],
  ["#220c10", "#ef4444", "#fbbf24"],
  ["#0f172a", "#a78bfa", "#f472b6"],
  ["#06201a", "#10b981", "#facc15"],
  ["#1a1a1a", "#9ca3af", "#f5f5f4"],
];

/** Gera uma imagem abstrata (gradientes + formas) marcada como DEMO. */
async function demoImage(seed: number, w = 1600, h = 2000, desaturate = false): Promise<Buffer> {
  const p = palettes[seed % palettes.length]!;
  const cx = 30 + ((seed * 37) % 40);
  const cy = 25 + ((seed * 53) % 50);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <defs>
      <radialGradient id="g" cx="${cx}%" cy="${cy}%" r="80%"><stop offset="0" stop-color="${p[2]}"/><stop offset="0.35" stop-color="${p[1]}"/><stop offset="1" stop-color="${p[0]}"/></radialGradient>
      <linearGradient id="l" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0.65"/><stop offset="1" stop-color="#000" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#g)"/>
    <circle cx="${w * 0.7}" cy="${h * 0.35}" r="${w * 0.18}" fill="${p[2]}" fill-opacity="0.35"/>
    <rect x="${w * 0.08}" y="${h * 0.62}" width="${w * 0.5}" height="${h * 0.02}" fill="#fff" fill-opacity="0.25"/>
    <rect width="100%" height="100%" fill="url(#l)"/>
    <text x="${w * 0.06}" y="${h * 0.93}" font-family="sans-serif" font-size="${w * 0.04}" fill="#fff" fill-opacity="0.6" letter-spacing="8">FRAME · DEMO</text>
  </svg>`;
  let img = sharp(Buffer.from(svg));
  if (desaturate) img = img.modulate({ saturation: 0.15, brightness: 0.85 });
  return img.jpeg({ quality: 88 }).toBuffer();
}

async function ensureUser(p: (typeof people)[number]) {
  const [existing] = await db.select().from(user).where(eq(user.email, p.email)).limit(1);
  if (existing) return existing.id;
  const res = await auth.api.signUpEmail({ body: { name: p.name, email: p.email, password: PASSWORD } });
  const id = res.user.id;
  // Contas demo "antigas" para permitir votar nos desafios de demonstração.
  await db.update(user).set({ createdAt: new Date(Date.now() - 90 * 864e5) }).where(eq(user.id, id));
  await db
    .update(profile)
    .set({ handle: p.handle, bio: p.bio, specialties: p.specialties, interests: p.interests, onboardedAt: new Date(), isIndexable: false, availableForWork: p.specialties.length > 0 })
    .where(eq(profile.userId, id));
  return id;
}

async function main() {
  console.log("→ Criando contas de demonstração…");
  const ids: string[] = [];
  for (const p of people) ids.push(await ensureUser(p));
  const [lia, caio, nanda, theo, bia, admin] = ids as [string, string, string, string, string, string];
  await db.update(user).set({ role: "admin" }).where(eq(user.id, admin));
  const v = (id: string) => ({ id, role: "user" as const, createdAt: new Date(0) });

  const [{ n }] = (await db.execute<{ n: number }>(sql`select count(*)::int as n from post`)) as unknown as [{ n: number }];
  if (n > 0) {
    console.log("Já existem publicações — seed de conteúdo ignorado.");
    process.exit(0);
  }

  console.log("→ Gerando imagens e publicações…");
  let seed = 1;
  const upload = async (owner: string, opts?: { w?: number; h?: number; desaturate?: boolean; purpose?: "post" | "showcase_before" }) => {
    const data = await demoImage(seed++, opts?.w, opts?.h, opts?.desaturate);
    return storeUpload({ ownerId: owner, purpose: opts?.purpose ?? "post", data });
  };

  const works: { author: string; title: string; body: string; categories: string[]; tools: string[]; w?: number; h?: number; collab?: boolean }[] = [
    { author: lia, title: "Janela de fim de tarde", body: "Retrato com uma única janela e um rebatedor dourado.", categories: ["fotografia", "retrato"], tools: ["Canon R6", "Lightroom"] },
    { author: nanda, title: "Centro histórico em azul", body: "Hora azul, só celular, sem tripé.", categories: ["mobile", "street"], tools: ["iPhone 13", "Lightroom Mobile"], w: 2000, h: 1400 },
    { author: theo, title: "Tipografia em movimento — estudo 03", body: "Frame do loop de 8s.", categories: ["motion", "design"], tools: ["After Effects"], w: 1920, h: 1080 },
    { author: bia, title: "Casamento na fazenda", body: "Cerimônia ao ar livre com luz dura do meio-dia.", categories: ["eventos", "fotografia"], tools: ["Sony A7 IV"] },
    { author: caio, title: "Frame do curta 'Maré'", body: "Grade com contraste suave e verdes dessaturados.", categories: ["video", "color-grading"], tools: ["DaVinci Resolve"], w: 2400, h: 1000, collab: true },
    { author: nanda, title: "Sombras na feira", body: "Contraluz às 7h.", categories: ["street", "mobile"], tools: ["Galaxy S23"] },
    { author: theo, title: "Pôster para festival independente", body: "Projeto colaborativo com a Lia (fotos).", categories: ["design", "arte-digital"], tools: ["Figma", "Photoshop"], collab: true },
    { author: lia, title: "Retrato em contraluz", body: "", categories: ["retrato", "fotografia"], tools: ["50mm f/1.8"] },
  ];
  const created: string[] = [];
  for (const w of works) {
    const m = await upload(w.author, { w: w.w, h: w.h });
    const r = await createPost(v(w.author), { kind: "work", format: "photo", title: w.title, body: w.body, categories: w.categories, tools: w.tools, isCollaborative: !!w.collab }, { mediaIds: [m.id] });
    created.push(r.id);
  }

  // Carrossel
  const c1 = await upload(bia);
  const c2 = await upload(bia);
  const c3 = await upload(bia);
  created.push((await createPost(v(bia), { kind: "work", format: "carousel", title: "Making of — ensaio de 15 anos", body: "Bastidores em 3 quadros.", categories: ["eventos"], tools: [] }, { mediaIds: [c1.id, c2.id, c3.id] })).id);

  // Showcase com antes/depois
  const before = await upload(lia, { desaturate: true, purpose: "showcase_before" });
  seed--; // mesma composição para o "depois"
  const after = await upload(lia);
  const showcaseId = (
    await createPost(
      v(lia),
      {
        kind: "showcase",
        format: "before_after",
        title: "Do RAW ao retrato final",
        body: "Como transformei um arquivo chapado em um retrato quente sem perder a pele.",
        categories: ["retrato", "color-grading", "edicao"],
        tools: ["Lightroom"],
        showcase: {
          process: "Comecei corrigindo o balanço de branco pela pele, depois curvas suaves e máscaras radiais para guiar o olhar.\nO preset foi só ponto de partida — cada foto pediu ajustes próprios.",
          camera: "Canon R6",
          lens: "RF 85mm f/2",
          lighting: "Janela lateral + rebatedor dourado",
          software: ["Lightroom Classic"],
          presetName: "Âmbar Suave (próprio)",
          editParams: "Temperatura +350K\nCurva em S leve\nHSL laranja: sat -8, lum +6\nMáscara radial no rosto: exposição +0,25",
          credits: [{ name: "Joana", role: "Modelo" }],
          hideTechnical: false,
        },
      },
      { mediaIds: [after.id], beforeMediaId: before.id },
    )
  ).id;
  created.push(showcaseId);

  // Tutoriais
  const tutorials = [
    { author: caio, title: "Color grading com nós seriais no DaVinci", topic: "davinci-resolve", level: "intermediario", minutes: 25, steps: [{ title: "Balance primário", body: "Use os scopes para neutralizar antes de estilizar." }, { title: "Contraste por curvas", body: "Separe contraste global de contraste local." }, { title: "Look em nó separado", body: "Facilita ajustar intensidade depois." }] },
    { author: nanda, title: "Fotografia noturna com celular sem tripé", topic: "fotografia-celular", level: "iniciante", minutes: 8, steps: [{ title: "Apoie o celular", body: "Muretas, postes, sua mochila." }, { title: "Trave foco e exposição", body: "Toque e segure no ponto principal." }, { title: "Edite com cuidado", body: "Reduza ruído antes de clarear sombras." }] },
    { author: lia, title: "Pele natural no Lightroom", topic: "lightroom", level: "iniciante", minutes: 12, steps: [{ title: "Balanço de branco pela pele", body: "Conta-gotas numa área neutra próxima." }, { title: "HSL do laranja", body: "Pequenos ajustes; olhe a foto inteira." }] },
  ];
  for (const t of tutorials) {
    const m = await upload(t.author, { w: 1600, h: 1200 });
    created.push(
      (
        await createPost(v(t.author), { kind: "tutorial", format: "photo", title: t.title, body: "Tutorial de demonstração.", categories: ["edicao"], tools: [], tutorial: { topic: t.topic, level: t.level, durationMinutes: t.minutes, software: "", steps: t.steps, resources: [] } }, { mediaIds: [m.id] })
      ).id,
    );
  }

  console.log("→ Conexões, curtidas e comentários…");
  await setFollow(v(nanda), lia, true);
  await setFollow(v(theo), lia, true);
  await setFollow(v(lia), caio, true);
  await setFollow(v(bia), nanda, true);
  for (const [who, idx] of [[caio, 0], [nanda, 0], [theo, 1], [lia, 4], [bia, 4], [theo, created.length - 4]] as const) {
    await toggleLike(v(who), created[idx]!);
  }
  await addComment(v(caio), { postId: showcaseId, body: "A máscara radial no rosto fez toda a diferença. Você usou feather alto?" });
  await addComment(v(nanda), { postId: created[0]!, body: "Que luz! Qual era a distância da janela?" });

  console.log("→ Comunidades…");
  const comms = [
    { owner: nanda, name: "Fotografia Mobile Brasil", description: "Para quem cria com o celular: técnicas, apps e trocas de feedback.", rules: "Só fotos feitas com celular.\nCritique a foto, não a pessoa.\nCredite apps e presets de terceiros.", categories: ["mobile", "fotografia"], access: "public" as const },
    { owner: caio, name: "Color Grading Lab", description: "Discussões sobre cor em foto e vídeo, com antes/depois.", rules: "Sempre mostre o antes.\nSem pirataria de LUTs.", categories: ["color-grading", "video"], access: "public" as const },
    { owner: bia, name: "Fotógrafos de Casamento", description: "Bastidores, orçamentos e fluxo de trabalho em eventos.", rules: "Respeite a privacidade dos noivos.", categories: ["eventos"], access: "private" as const },
    { owner: theo, name: "Equipamentos Acessíveis", description: "Como criar bem com pouco: câmeras usadas, luz caseira, DIY.", rules: "Sem links de afiliado.", categories: ["fotografia", "video"], access: "public" as const },
  ];
  for (const c of comms) {
    const created = await createCommunity(v(c.owner), c);
    for (const m of [lia, caio, nanda, theo, bia]) if (m !== c.owner) await joinCommunity(v(m), created.id).catch(() => undefined);
  }

  console.log("→ Desafios…");
  const now = Date.now();
  const day = 864e5;
  const inserted = await db.insert(challenge).values([
    { slug: "uma-foto-tres-edicoes", title: "Uma foto, três edições", theme: "Edite a mesma foto de três jeitos diferentes.", briefing: "Escolha uma foto sua e crie três versões com intenções distintas (ex.: documental, cinematográfica, editorial). Publique como carrossel.", rules: ["Use uma foto sua.", "Publique as três versões no mesmo post."], category: "edicao", level: "todos", cadence: "semanal", palette: [], startsAt: new Date(now - 2 * day), submissionDeadline: new Date(now + 5 * day), votingEnabled: true, votingEndsAt: new Date(now + 8 * day), createdById: admin },
    { slug: "luz-natural", title: "Só luz natural", theme: "Fotografe usando apenas luz disponível.", briefing: "Nada de flash ou LED. Janela, sol, reflexos, sombras: mostre como você lê a luz.", rules: ["Sem iluminação artificial.", "Conte no post onde estava a luz."], category: "fotografia", level: "iniciante", cadence: "semanal", palette: ["#f59e0b", "#1b1035"], startsAt: new Date(now - 9 * day), submissionDeadline: new Date(now - 1 * day), votingEnabled: true, votingEndsAt: new Date(now + 2 * day), createdById: admin },
    { slug: "paleta-noturna", title: "Grade na paleta noturna", theme: "Color grading com a paleta definida.", briefing: "Faça um grade (foto ou frame de vídeo) usando a paleta do desafio como guia.", rules: ["Use a paleta como referência, não como filtro."], category: "color-grading", level: "profissional", cadence: "mensal", palette: ["#0b1a2e", "#3b82f6", "#5eead4", "#f472b6"], startsAt: new Date(now - 40 * day), submissionDeadline: new Date(now - 12 * day), votingEnabled: true, votingEndsAt: new Date(now - 5 * day), createdById: admin },
  ]).returning({ id: challenge.id, slug: challenge.slug });
  const bySlug = Object.fromEntries(inserted.map((c) => [c.slug, c.id]));
  // Envios diretos (os desafios de demonstração já passaram da fase de envio).
  await db.insert(challengeSubmission).values([
    { challengeId: bySlug["luz-natural"]!, postId: created[0]!, userId: lia, note: "Janela lateral, 17h." },
    { challengeId: bySlug["luz-natural"]!, postId: created[5]!, userId: nanda, note: "Contraluz na feira." },
    { challengeId: bySlug["luz-natural"]!, postId: created[3]!, userId: bia },
    { challengeId: bySlug["paleta-noturna"]!, postId: created[4]!, userId: caio, voteCount: 4 },
    { challengeId: bySlug["paleta-noturna"]!, postId: created[1]!, userId: nanda, voteCount: 2 },
  ]);

  console.log(`✓ Seed concluído. Senha das contas demo: ${PASSWORD}`);
  console.log("  Admin: admin@demo.frame.local");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
