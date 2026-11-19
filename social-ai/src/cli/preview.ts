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
  ['feed', feedImageSvg(b, { kicker: 'Evangelho do dia', headline: 'Se tu também compreendesses a paz', sub: 'Lc 19,41-44 · Jesus chora sobre Jerusalém. O que tem tirado a sua paz hoje?' })],
  ['cover', carouselSlideSvg(b, { index: 0, total: 6, title: '5 passos para rezar o terço sem se distrair', kind: 'cover', kicker: 'Devoção' })],
  ['slide', carouselSlideSvg(b, { index: 2, total: 6, title: 'Escolha um lugar e uma hora', body: 'Rezar sempre no mesmo canto da casa ajuda o coração a entender: agora é tempo de Deus.', kind: 'content' })],
  ['reelcover', reelCoverSvg(b, { title: 'Deus não desiste de você', kicker: 'Reflexão' })],
  ['scene', reelSceneSvg(b, { text: 'Ele chorou por Jerusalém', emphasis: 'e chora por quem se afasta', index: 1, total: 4 })],
  ['story', storySvg(b, { text: 'Qual é o seu pedido de oração hoje?', kicker: 'Oração', prompt: 'Escreva nos comentários do Reel' })],
] as const;
const bufs = [];
for (const [n, r] of items) bufs.push(await sharp(Buffer.from(r.svg)).resize(r.w / 3, r.h / 3, { fit: 'contain', background: '#000' }).extend({ bottom: Math.round((1920 - r.h) / 3), background: '#000' }).png().toBuffer());
const W = 360, H = 640;
await sharp({ create: { width: W * 6 + 50, height: H, channels: 3, background: '#222' } }).composite(bufs.map((input, i) => ({ input, left: i * (W + 10), top: 0 }))).png().toFile(out);
