// Gera uma prancha de pré-visualização dos templates da identidade visual: npm run preview -- <saida.png>
import sharp from 'sharp';
import { getBrand } from "../db/repo.js";
import { loadEnv } from "../config/env.js";
import { DEFAULT_BRAND } from '../creative/brandDefaults.js';
import { carouselSlideSvg, feedImageSvg, reelCoverSvg, storySvg, reelSceneSvg } from '../creative/templates.js';
loadEnv();
let b: any;
try { b = getBrand(); } catch { b = { ...DEFAULT_BRAND, handle: "perfil_ficticio" }; }
const out = process.argv[2] ?? 'storage/preview-templates.png';
const items = [
  ['feed', feedImageSvg(b, { kicker: 'Fotografia', headline: 'A janela é o seu melhor refletor', sub: 'Posicione o assunto a 45 graus da luz natural e desligue o flash.' })],
  ['cover', carouselSlideSvg(b, { index: 0, total: 6, title: '5 ajustes de luz que mudam suas fotos no celular', kind: 'cover', kicker: 'Guia' })],
  ['slide', carouselSlideSvg(b, { index: 2, total: 6, title: 'Baixe a exposição', body: 'Arraste o ícone de sol para baixo até as altas luzes voltarem. Céu estourado não tem conserto na edição.', kind: 'content' })],
  ['reelcover', reelCoverSvg(b, { title: 'Luz boa sem equipamento', kicker: 'Reel' })],
  ['scene', reelSceneSvg(b, { text: 'Fixe o foco e a exposição', emphasis: 'segure o dedo na tela', index: 1, total: 4 })],
  ['story', storySvg(b, { text: 'Você fotografa mais de dia ou de noite?', kicker: 'Enquete', prompt: 'Responda nos comentários do Reel' })],
] as const;
const bufs = [];
for (const [n, r] of items) bufs.push(await sharp(Buffer.from(r.svg)).resize(r.w / 3, r.h / 3, { fit: 'contain', background: '#000' }).extend({ bottom: Math.round((1920 - r.h) / 3), background: '#000' }).png().toBuffer());
const W = 360, H = 640;
await sharp({ create: { width: W * 6 + 50, height: H, channels: 3, background: '#222' } }).composite(bufs.map((input, i) => ({ input, left: i * (W + 10), top: 0 }))).png().toFile(out);
