#!/usr/bin/env node
/**
 * Busca e baixa vídeos reais para cada plano do documentário, registrando fonte e licença.
 *
 * Fontes (somente APIs oficiais, respeitando limites):
 *   1. Pexels      https://www.pexels.com/api/documentation/#videos   (PEXELS_API_KEY)
 *   2. Pixabay     https://pixabay.com/api/docs/#api_search_videos     (PIXABAY_API_KEY)
 *   3. Wikimedia   https://commons.wikimedia.org/w/api.php             (sem chave; só licenças livres)
 *   4. Internet Archive https://archive.org/advancedsearch.php         (sem chave; só lista candidatos,
 *      a menos que --include-archive seja passado, porque a qualidade e os direitos variam muito)
 *   Unsplash não tem vídeos na API (só fotos), por isso não entra aqui.
 *
 * Uso:
 *   node scripts/fetch-media.mjs --dry-run           pesquisa e grava metadata/candidates.json, sem baixar
 *   node scripts/fetch-media.mjs                     pesquisa, escolhe e baixa um clipe por plano
 *   node scripts/fetch-media.mjs --only=o-door,w-hit  só esses planos
 *   node scripts/fetch-media.mjs --replace=w-hit      troca o clipe já escolhido de um plano
 *   node scripts/fetch-media.mjs --include-archive    permite baixar do Internet Archive
 *
 * As requisições usam o curl do sistema (respeita HTTPS_PROXY e certificados do sistema).
 * Depois rode `npm run assets:scan` para a composição enxergar os arquivos.
 */
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = join(ROOT, "public");
const META = join(PUBLIC, "assets", "metadata");
const MANIFEST = join(META, "media-manifest.json");
const CANDIDATES = join(META, "candidates.json");
const USER_AGENT = "PascomDocumentario/1.0 (projeto pastoral sem fins lucrativos; https://github.com/chagas019/chagas019)";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const DRY = Boolean(args["dry-run"]);
const ONLY = args.only ? String(args.only).split(",") : null;
const REPLACE = args.replace ? String(args.replace).split(",") : [];

loadDotEnv();
const PEXELS_KEY = process.env.PEXELS_API_KEY?.trim();
const PIXABAY_KEY = process.env.PIXABAY_API_KEY?.trim();

const timeline = JSON.parse(readFileSync(join(ROOT, "src", "data", "timeline.json"), "utf8"));
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { items: [] };

function loadDotEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Limite de ritmo por plataforma (abaixo dos limites publicados). */
const pacing = { pexels: 1200, pixabay: 900, wikimedia: 500, archive: 1000 };
const last = {};
async function pace(platform) {
  const wait = (last[platform] ?? 0) + pacing[platform] - Date.now();
  if (wait > 0) await sleep(wait);
  last[platform] = Date.now();
}

async function getJson(platform, url, headers = {}) {
  await pace(platform);
  const h = Object.entries({ "User-Agent": USER_AGENT, ...headers }).flatMap(([k, v]) => ["-H", `${k}: ${v}`]);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const { stdout } = await run("curl", ["-sS", "--fail-with-body", "--max-time", "40", ...h, url], { maxBuffer: 64 * 1024 * 1024 });
      return JSON.parse(stdout);
    } catch (err) {
      const msg = String(err.stdout || err.stderr || err.message).slice(0, 300);
      if (/429|rate/i.test(msg)) {
        console.warn(`  ${platform}: limite de requisições atingido, aguardando 60 s`);
        await sleep(60000);
        continue;
      }
      if (attempt === 3) throw new Error(`${platform}: ${msg}`);
      await sleep(2000 * 2 ** attempt);
    }
  }
}

async function download(url, dest, headers = {}) {
  mkdirSync(dirname(dest), { recursive: true });
  const part = `${dest}.part`;
  const h = Object.entries({ "User-Agent": USER_AGENT, ...headers }).flatMap(([k, v]) => ["-H", `${k}: ${v}`]);
  await run("curl", ["-sS", "-L", "--fail", "--retry", "3", "--max-time", "900", ...h, "-o", part, url]);
  if (!existsSync(part) || statSync(part).size < 50_000) {
    rmSync(part, { force: true });
    throw new Error("download vazio ou incompleto");
  }
  renameSync(part, dest);
}

async function probe(file) {
  const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,codec_name:format=duration", "-of", "json", file]);
  const j = JSON.parse(stdout);
  const s = j.streams?.[0];
  if (!s) throw new Error("arquivo sem trilha de vídeo");
  const [n, d] = String(s.r_frame_rate).split("/").map(Number);
  return { width: s.width, height: s.height, fps: d ? Math.round((n / d) * 100) / 100 : n, codec: s.codec_name, durationSec: Number(j.format.duration) };
}

/** Converte formatos abertos (WebM/OGV) para H.264, compatível com qualquer render. */
async function toMp4(src, dest) {
  await run("ffmpeg", ["-y", "-loglevel", "error", "-i", src, "-an", "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-pix_fmt", "yuv420p", dest]);
  rmSync(src, { force: true });
}

// ---------------------------------------------------------------- pesquisa por plataforma

async function searchPexels(query) {
  if (!PEXELS_KEY) return [];
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=15&size=medium`;
  const j = await getJson("pexels", url, { Authorization: PEXELS_KEY });
  return (j.videos ?? []).map((v) => {
    const files = (v.video_files ?? []).filter((f) => f.file_type === "video/mp4" && f.link);
    // arquivo mais próximo de 1080 px no lado menor, sem passar de 4K
    const best = files
      .filter((f) => Math.min(f.width, f.height) >= 720)
      .sort((a, b) => Math.abs(Math.min(a.width, a.height) - 1080) - Math.abs(Math.min(b.width, b.height) - 1080))[0];
    return best && {
      platform: "Pexels",
      sourceId: `pexels-${v.id}`,
      pageUrl: v.url,
      downloadUrl: best.link,
      author: v.user?.name ?? null,
      authorUrl: v.user?.url ?? null,
      license: "Pexels License (uso gratuito, atribuição não obrigatória; proibido revender sem alterações ou sugerir endosso de pessoas retratadas)",
      licenseUrl: "https://www.pexels.com/license/",
      attributionRequired: false,
      width: best.width,
      height: best.height,
      fps: best.fps ?? null,
      durationSec: v.duration,
      ext: "mp4",
      query,
    };
  }).filter(Boolean);
}

async function searchPixabay(query) {
  if (!PIXABAY_KEY) return [];
  const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=20&safesearch=true`;
  const j = await getJson("pixabay", url);
  return (j.hits ?? []).map((h) => {
    const v = h.videos?.large?.url ? h.videos.large : h.videos?.medium;
    return v?.url && {
      platform: "Pixabay",
      sourceId: `pixabay-${h.id}`,
      pageUrl: h.pageURL,
      downloadUrl: v.url,
      author: h.user ?? null,
      authorUrl: h.user_id ? `https://pixabay.com/users/${h.user}-${h.user_id}/` : null,
      license: "Pixabay Content License (uso gratuito, atribuição não obrigatória; arquivo deve ser baixado, não incorporado por link direto)",
      licenseUrl: "https://pixabay.com/service/license-summary/",
      attributionRequired: false,
      width: v.width,
      height: v.height,
      fps: null,
      durationSec: h.duration,
      ext: "mp4",
      query,
    };
  }).filter(Boolean);
}

const FREE_LICENSE = /^(cc0|public domain|pd|cc by(-sa)? ?\d|cc-by(-sa)?-\d)/i;
async function searchWikimedia(query) {
  const url =
    "https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=15" +
    `&gsrsearch=${encodeURIComponent(`${query} filetype:video`)}` +
    "&prop=imageinfo&iiprop=url|size|mime|extmetadata";
  const j = await getJson("wikimedia", url);
  return Object.values(j.query?.pages ?? {})
    .map((p) => {
      const ii = p.imageinfo?.[0];
      const md = ii?.extmetadata ?? {};
      const lic = md.LicenseShortName?.value ?? "";
      if (!ii || !FREE_LICENSE.test(lic)) return null;
      return {
        platform: "Wikimedia Commons",
        sourceId: `commons-${p.pageid}`,
        pageUrl: ii.descriptionurl,
        downloadUrl: ii.url,
        author: (md.Artist?.value ?? "").replace(/<[^>]+>/g, "").trim() || null,
        authorUrl: null,
        license: lic,
        licenseUrl: md.LicenseUrl?.value ?? null,
        attributionRequired: md.AttributionRequired?.value === "true",
        width: ii.width,
        height: ii.height,
        fps: null,
        durationSec: Number(ii.duration ?? md.Duration?.value ?? 0) || null,
        ext: (ii.url.split(".").pop() || "webm").toLowerCase(),
        query,
      };
    })
    .filter(Boolean);
}

async function searchArchive(query) {
  const q = `(${query}) AND mediatype:movies AND (licenseurl:*creativecommons.org* OR licenseurl:*publicdomain*)`;
  const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=licenseurl&rows=8&output=json`;
  const j = await getJson("archive", url);
  return (j.response?.docs ?? []).map((d) => ({
    platform: "Internet Archive",
    sourceId: `archive-${d.identifier}`,
    pageUrl: `https://archive.org/details/${d.identifier}`,
    downloadUrl: null, // resolvido via /metadata só se o item for escolhido
    identifier: d.identifier,
    author: Array.isArray(d.creator) ? d.creator.join(", ") : d.creator ?? null,
    authorUrl: null,
    license: d.licenseurl,
    licenseUrl: d.licenseurl,
    attributionRequired: !/publicdomain|zero/i.test(d.licenseurl ?? ""),
    width: null,
    height: null,
    fps: null,
    durationSec: null,
    ext: "mp4",
    query,
  }));
}

async function resolveArchive(c) {
  const j = await getJson("archive", `https://archive.org/metadata/${encodeURIComponent(c.identifier)}`);
  const file = (j.files ?? []).filter((f) => /\.mp4$/i.test(f.name) && f.source !== "metadata").sort((a, b) => Number(b.height ?? 0) - Number(a.height ?? 0))[0];
  if (!file) return null;
  return { ...c, downloadUrl: `https://archive.org/download/${c.identifier}/${encodeURIComponent(file.name)}`, width: Number(file.width) || null, height: Number(file.height) || null, durationSec: Number(file.length) || null };
}

// ---------------------------------------------------------------- escolha

function score(c, shot) {
  const need = (shot.end - shot.start + 1) * (shot.slowMo ?? 1);
  let s = 0;
  if (c.width && c.height) {
    s += c.height > c.width ? 40 : 10; // vertical encaixa sem corte no 9:16
    s += Math.min(c.width, c.height) >= 1080 ? 25 : Math.min(c.width, c.height) >= 720 ? 10 : -50;
  }
  if (c.durationSec) s += c.durationSec >= need ? 20 : -30;
  if (shot.slowMo && c.fps && c.fps >= 50) s += 15; // câmera lenta real
  s += { Pexels: 8, Pixabay: 6, "Wikimedia Commons": 2, "Internet Archive": -10 }[c.platform] ?? 0;
  if (c.attributionRequired) s -= 3;
  return s;
}

const used = new Set(manifest.items.map((i) => i.sourceId));

async function main() {
  const shots = timeline.shots.filter((s) => s.slot && (!ONLY || ONLY.includes(s.id)));
  if (!PEXELS_KEY && !PIXABAY_KEY) {
    console.warn("Aviso: PEXELS_API_KEY e PIXABAY_API_KEY não definidas (.env). Só Wikimedia Commons e Internet Archive serão consultados.");
  }
  const allCandidates = {};
  for (const shot of shots) {
    const existing = manifest.items.find((i) => i.shotId === shot.id);
    if (existing && !REPLACE.includes(shot.id) && !DRY) {
      console.log(`= ${shot.id}: já tem ${existing.file}`);
      continue;
    }
    console.log(`> ${shot.id} (${shot.slot})`);
    const found = [];
    for (const q of shot.queries ?? []) {
      for (const [name, fn] of [["pexels", searchPexels], ["pixabay", searchPixabay], ["wikimedia", searchWikimedia], ["archive", searchArchive]]) {
        try {
          found.push(...(await fn(q)));
        } catch (err) {
          console.warn(`  ${name} falhou para "${q}": ${err.message}`);
        }
      }
    }
    const unique = [...new Map(found.map((c) => [c.sourceId, c])).values()].filter((c) => !used.has(c.sourceId));
    unique.sort((a, b) => score(b, shot) - score(a, shot));
    allCandidates[shot.id] = unique.slice(0, 12).map((c) => ({ ...c, score: score(c, shot) }));
    console.log(`  ${unique.length} candidatos; melhor: ${unique[0] ? `${unique[0].platform} ${unique[0].pageUrl}` : "nenhum"}`);
    if (DRY) continue;

    for (const cand of unique) {
      let c = cand;
      if (c.platform === "Internet Archive") {
        if (!args["include-archive"]) continue;
        c = await resolveArchive(c);
        if (!c) continue;
      }
      const folder = shot.slot.split("/")[0];
      const base = `${shot.slot.split("/")[1]}--${c.sourceId}`;
      const dest = join(PUBLIC, "assets", "footage", folder, `${base}.mp4`);
      try {
        if (c.ext !== "mp4") {
          const raw = join(PUBLIC, "assets", "footage", folder, `${base}.${c.ext}`);
          await download(c.downloadUrl, raw);
          await toMp4(raw, dest);
        } else {
          await download(c.downloadUrl, dest);
        }
        const info = await probe(dest);
        if (info.durationSec < 2) throw new Error("clipe curto demais");
        const item = {
          shotId: shot.id,
          slot: shot.slot,
          scene: timeline.acts.find((a) => a.id === shot.act)?.name,
          file: relative(PUBLIC, dest).split("\\").join("/"),
          platform: c.platform,
          sourceId: c.sourceId,
          originalUrl: c.pageUrl,
          downloadUrl: c.downloadUrl,
          author: c.author,
          authorUrl: c.authorUrl,
          license: c.license,
          licenseUrl: c.licenseUrl,
          attributionRequired: c.attributionRequired,
          resolution: `${info.width}x${info.height}`,
          width: info.width,
          height: info.height,
          fps: info.fps,
          durationSec: Math.round(info.durationSec * 100) / 100,
          trimStartSec: 0,
          searchQuery: c.query,
          downloadedAt: new Date().toISOString(),
          usageNotes: c.attributionRequired
            ? "Exige atribuição: incluir autor e licença nos créditos/descrição da publicação."
            : "Atribuição não obrigatória, mas recomendada nos créditos. Não sugerir que pessoas retratadas endossam a PASCOM.",
          verified: true,
        };
        manifest.items = manifest.items.filter((i) => i.shotId !== shot.id).concat(item);
        used.add(c.sourceId);
        console.log(`  ✓ ${item.file} (${item.resolution}, ${item.durationSec}s, ${item.platform})`);
        break;
      } catch (err) {
        rmSync(dest, { force: true });
        console.warn(`  × ${c.sourceId}: ${err.message}`);
      }
    }
  }

  mkdirSync(META, { recursive: true });
  if (DRY || Object.keys(allCandidates).length) {
    writeFileSync(CANDIDATES, JSON.stringify({ generatedAt: new Date().toISOString(), candidates: allCandidates }, null, 2));
    console.log(`candidatos: ${relative(ROOT, CANDIDATES)}`);
  }
  if (!DRY) {
    manifest.generatedAt = new Date().toISOString();
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
    writeSourcesMd();
    console.log(`manifesto: ${relative(ROOT, MANIFEST)} (${manifest.items.length} clipes)`);
  }
}

function writeSourcesMd() {
  const rows = manifest.items
    .sort((a, b) => a.shotId.localeCompare(b.shotId))
    .map((i) => `| ${i.shotId} | ${i.scene} | [${i.platform}](${i.originalUrl}) | ${i.author ?? "—"} | ${i.licenseUrl ? `[${i.license.split(" (")[0]}](${i.licenseUrl})` : i.license} | ${i.resolution} | ${i.durationSec}s | \`${i.file}\` |`);
  const md = `# Fontes das filmagens

Gerado por \`scripts/fetch-media.mjs\` em ${new Date().toISOString()}. Cada linha corresponde a um arquivo
realmente baixado e verificado com ffprobe. Detalhes completos em \`media-manifest.json\`.

| Plano | Ato | Origem | Autor | Licença | Resolução | Duração | Arquivo |
|---|---|---|---|---|---|---|---|
${rows.join("\n") || "| — | — | — | — | — | — | — | — |"}

## Trilha e efeitos

Trilha, ambiente e foley são composições originais sintetizadas por \`scripts/compose-audio.py\`
(sem amostras de terceiros). Licença: a mesma do projeto.
`;
  writeFileSync(join(META, "sources.md"), md);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
