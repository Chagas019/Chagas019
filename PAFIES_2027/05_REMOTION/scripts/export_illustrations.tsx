// Exporta as ilustrações vetoriais v2 (mesma fonte do vídeo) como SVG independentes.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import { Apple, Can, DonationBox, Hand, HeartIcon, MegaphoneHand, Milk, Person, Rice, Runner, Stadium } from '../src/v2/illus';
import { P } from '../src/v2/kit';
const out = path.resolve(process.argv[2]);
fs.mkdirSync(out, { recursive: true });
const items: [string, React.ReactElement, number, number][] = [
  ['megafone_mao', <MegaphoneHand x={470} y={200} />, 640, 700],
  ['mao_aberta_azul', <Hand x={160} y={400} />, 320, 640],
  ['mao_aberta_vermelha', <Hand x={160} y={400} sleeve={P.red} cuff={P.yellow} />, 320, 640],
  ['caixa_doacao', <DonationBox x={205} y={110} />, 420, 360],
  ['maca', <Apple x={100} y={110} />, 200, 200], ['lata', <Can x={100} y={105} />, 200, 200],
  ['arroz', <Rice x={100} y={110} />, 200, 210], ['leite', <Milk x={100} y={110} />, 200, 210],
  ['coracao', <HeartIcon x={100} y={100} />, 200, 200],
  ...[0, 1, 2, 3].map((i) => [`galera_pessoa_${i + 1}`, <Person i={i} x={100} y={330} shirt={[P.royal, P.red, P.navy, P.royal][i]} wave={0.5} />, 200, 340] as [string, React.ReactElement, number, number]),
  ['corredor_pernas', <Runner x={250} y={150} phase={0.6} />, 500, 620],
  ['estadio_fundo', <Stadium glow={1} />, 1080, 1920],
];
for (const [name, el, w, h] of items) {
  let svg = renderToStaticMarkup(el);
  svg = svg.replace(/^<svg[^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><title>PAFIES 2027 v2 — ${name}</title><g id="${name.toUpperCase()}">`).replace(/<\/svg>$/, '</g></svg>');
  fs.writeFileSync(path.join(out, name + '.svg'), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg);
}
console.log('exportados', items.length);
