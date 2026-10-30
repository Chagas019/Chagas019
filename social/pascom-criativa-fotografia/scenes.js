// Biblioteca de cenas e diagramas em SVG da coleção PASCOM CRIATIVA.
// Cenas "fotográficas" são sempre escuras (como uma cópia fotográfica);
// diagramas técnicos usam currentColor e se adaptam ao fundo do slide.
const C = {
  bg: '#191917', f1: '#23221f', f2: '#302f2b', f3: '#45433e', f4: '#67645d', f5: '#8f8b82',
  ln: '#d9d5ca', vest: '#c9c3b4', skin: '#8a7d6c', skin2: '#76695a',
  warm: '#ffcf70', acc: '#ffc21a', ink: '#0c0c0b'
};
const VB = {
  floorplan: '0 0 900 1000', phone: '0 0 600 1000', lensbar: '0 0 900 260', meter: '0 0 900 200',
  route: '0 0 900 900', panning: '0 0 900 520', silho: '0 0 900 520', height: '0 0 300 420',
  contact: '0 0 900 1000', sensor: '0 0 900 600', camera: '0 0 900 600', shake: '0 0 900 420'
};

const r1 = n => Math.round(n * 10) / 10;

function person(x, gy, h, o = {}) {
  const fill = o.fill || C.f3, hr = h * 0.12, w = h * (o.w || 0.42), sy = gy - h + hr * 2.3, r = w * 0.32;
  return `<circle cx="${r1(x)}" cy="${r1(gy - h + hr)}" r="${r1(hr)}" fill="${o.head || fill}"/>` +
    `<path d="M${r1(x - w / 2)} ${r1(gy)}V${r1(sy + r)}Q${r1(x - w / 2)} ${r1(sy)} ${r1(x - w / 2 + r)} ${r1(sy)}H${r1(x + w / 2 - r)}Q${r1(x + w / 2)} ${r1(sy)} ${r1(x + w / 2)} ${r1(sy + r)}V${r1(gy)}Z" fill="${fill}"/>`;
}
const glow = (x, y, r, col = C.warm, k = 1) =>
  [1, .66, .4].map((f, i) => `<circle cx="${x}" cy="${y}" r="${r1(r * f)}" fill="${col}" opacity="${(.05 + i * .05) * k}"/>`).join('');
const candle = (x, y, h, s = 1) =>
  glow(x, y - 10 * s, 60 * s) + `<rect x="${x - 7 * s}" y="${y}" width="${14 * s}" height="${h}" fill="#d8d1bf"/>` +
  `<ellipse cx="${x}" cy="${y - 12 * s}" rx="${6 * s}" ry="${13 * s}" fill="${C.warm}"/>`;

/* ---------------- cenas fotográficas ---------------- */
const S = {};

// interior da igreja visto do fundo, eixo central
S.nave = (o = {}) => {
  let s = `<rect width="900" height="600" fill="${C.bg}"/>`;
  s += `<rect x="300" y="80" width="300" height="262" fill="${C.f1}"/>`;
  s += `<path d="M335 342V185a115 115 0 0 1 230 0V342Z" fill="${C.f2}"/>`;
  s += `<rect x="432" y="118" width="36" height="96" fill="${C.f5}" opacity=".55"/>` + glow(450, 166, 120, C.warm, .5);
  s += `<path d="M0 600L300 342H600L900 600Z" fill="${C.f1}"/>`;
  for (let i = 0; i < 5; i++) {
    const t = i / 5, xl = 30 + 270 * t, w = 70 * (1 - t) + 12, top = 80 * t, bot = 600 - 258 * t;
    s += `<rect x="${r1(xl)}" y="${r1(top)}" width="${r1(w)}" height="${r1(bot - top)}" fill="${C.f2}"/>`;
    s += `<rect x="${r1(900 - xl - w)}" y="${r1(top)}" width="${r1(w)}" height="${r1(bot - top)}" fill="${C.f2}"/>`;
  }
  if (o.priest !== false) s += person(450, 318, 66, { fill: C.vest, w: .5 });
  if (o.elevate) s += `<circle cx="450" cy="236" r="9" fill="#fff"/>` + glow(450, 236, 40, '#fff');
  s += `<rect x="392" y="298" width="116" height="44" fill="${C.f4}"/><rect x="392" y="298" width="116" height="7" fill="${C.ln}"/>`;
  s += candle(380, 282, 20, .5) + candle(520, 282, 20, .5);
  for (let i = 7; i >= 0; i--) {
    const t = i / 8, y = 600 - 250 * Math.pow(t, .85), k = 1 - .8 * t, aisle = 14 + 58 * k, len = 330 * k, ph = 16 * k;
    [[450 - aisle - len, 450 - aisle], [450 + aisle, 450 + aisle + len]].forEach(([a, b]) => {
      if (o.people !== false) for (let j = 0; j < 5; j++) {
        if ((i * 7 + j * 3) % 5 === 0) continue;
        s += person(a + (b - a) * (j + .5) / 5, y - ph * .4, 60 * k, { fill: (i + j) % 3 ? C.f3 : C.f4 });
      }
      s += `<rect x="${r1(a)}" y="${r1(y - ph)}" width="${r1(b - a)}" height="${r1(ph)}" fill="${C.f2}"/>`;
    });
  }
  if (o.blocker) s += person(450, 640, 420, { fill: '#0a0a09' }) + `<rect x="405" y="300" width="90" height="56" rx="8" fill="#000"/>`;
  return s;
};

// altar em plano médio
S.altar = (o = {}) => {
  let s = `<rect width="900" height="600" fill="${C.f1}"/>`;
  s += `<path d="M190 600V250a260 260 0 0 1 520 0V600Z" fill="${C.f2}"/>`;
  s += `<rect x="420" y="60" width="60" height="150" fill="${C.f4}" opacity=".5"/>` + glow(450, 130, 170, C.warm, .4);
  s += candle(240, 330, 100) + candle(660, 330, 100);
  const gy = 470, h = 300, hr = h * .12, sy = gy - h + hr * 2.3;
  s += person(450, gy, h, { fill: C.vest, w: .62, head: C.skin });
  s += `<path d="M430 ${sy}h40l-6 ${gy - sy}h-28Z" fill="${C.acc}" opacity=".55"/>`;
  if (o.elevate) {
    s += `<path d="M400 ${sy + 30}L432 ${gy - h - 34}M500 ${sy + 30}L468 ${gy - h - 34}" stroke="${C.vest}" stroke-width="34" stroke-linecap="round"/>`;
    s += glow(450, gy - h - 70, 90, '#fff') + `<circle cx="450" cy="${gy - h - 70}" r="30" fill="#fffaf0"/>`;
  }
  s += `<rect x="150" y="430" width="600" height="170" fill="${C.f4}"/><rect x="150" y="430" width="600" height="22" fill="#ddd7c8"/>`;
  if (o.chalice) s += `<path d="M560 430v-8h40v8ZM572 422l6-30h4l6 30ZM556 360h48q-4 32-24 34q-20-2-24-34Z" fill="${C.warm}" opacity=".9"/>`;
  return s;
};

// adoração: ostensório no escuro
S.monstrance = (o = {}) => {
  let s = `<rect width="900" height="600" fill="#0b0b0a"/>` + glow(450, 240, 320, C.warm, o.blown ? 3 : 1);
  for (let a = 0; a < 360; a += 10) {
    const rad = a * Math.PI / 180, R = a % 20 ? 118 : 150;
    s += `<line x1="${r1(450 + 64 * Math.cos(rad))}" y1="${r1(240 + 64 * Math.sin(rad))}" x2="${r1(450 + R * Math.cos(rad))}" y2="${r1(240 + R * Math.sin(rad))}" stroke="#e5c378" stroke-width="3"/>`;
  }
  s += `<circle cx="450" cy="240" r="58" fill="none" stroke="#e5c378" stroke-width="7"/><circle cx="450" cy="240" r="44" fill="#fff7e4"/>`;
  s += `<rect x="444" y="298" width="12" height="112" fill="#c9a85e"/><ellipse cx="450" cy="352" rx="18" ry="10" fill="#c9a85e"/><path d="M398 438L420 408H480L502 438Z" fill="#c9a85e"/>`;
  s += `<rect y="438" width="900" height="162" fill="#151513"/><rect y="438" width="900" height="6" fill="#4a463d"/>`;
  s += candle(210, 320, 118, 1.1) + candle(690, 320, 118, 1.1);
  if (o.kneel !== false) s += person(120, 660, 330, { fill: '#040404' }) + person(300, 690, 300, { fill: '#050505' }) + person(800, 670, 340, { fill: '#040404' });
  if (o.blown) s += `<rect width="900" height="600" fill="#fff" opacity=".52"/>` + `<circle cx="450" cy="240" r="170" fill="#fff"/>` + glow(450, 240, 330, '#fff', 3);
  return s;
};

// procissão na rua, à noite
S.procession = (o = {}) => {
  let s = `<rect width="900" height="600" fill="#121211"/>`;
  s += `<path d="M0 600L390 285H510L900 600Z" fill="${C.f1}"/>`;
  s += `<path d="M0 0H330L390 285L0 600Z" fill="${C.f2}"/><path d="M900 0H570L510 285L900 600Z" fill="${C.f2}"/>`;
  for (let i = 0; i < 6; i++) {
    const t = i / 6, y = 120 + 140 * t, x = 40 + 300 * t, w = 40 * (1 - t) + 6;
    s += `<rect x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(w * 1.3)}" fill="${C.warm}" opacity=".35"/>`;
    s += `<rect x="${r1(900 - x - w)}" y="${r1(y)}" width="${r1(w)}" height="${r1(w * 1.3)}" fill="${C.warm}" opacity=".3"/>`;
  }
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), side = i % 2 ? 1 : -1, gy = 290 + 330 * Math.pow(t, 1.5), h = 34 + 330 * Math.pow(t, 1.7);
    const x = 450 + side * (12 + 150 * Math.pow(t, 1.6));
    if (i === n - 1 && o.cross !== false) continue;
    s += person(x, gy, h, { fill: t > .7 ? C.f4 : C.f3 });
    s += glow(x + side * -h * .16, gy - h * .5, 14 + 40 * t, C.warm) + `<circle cx="${r1(x + side * -h * .16)}" cy="${r1(gy - h * .5)}" r="${r1(2 + 5 * t)}" fill="${C.warm}"/>`;
  }
  if (o.cross !== false) s += person(450, 640, 380, { fill: C.f4 }) + `<rect x="444" y="40" width="12" height="420" fill="${C.ln}"/><rect x="410" y="70" width="80" height="12" fill="${C.ln}"/>`;
  return s;
};

// uma pessoa caminhando, de lado (para espaço de movimento)
S.walker = (o = {}) => {
  const x = o.x || 450;
  let s = `<rect width="900" height="600" fill="#121211"/><rect y="470" width="900" height="130" fill="${C.f1}"/>`;
  for (let i = 0; i < 9; i++) s += `<rect x="${i * 110 - 20}" y="140" width="70" height="90" fill="${C.warm}" opacity=".12"/>`;
  s += person(x, 520, 380, { fill: C.f4, w: .36 });
  s += `<path d="M${x + 22} ${520 - 380 * .78}l26 10l-26 10Z" fill="${C.f4}"/>`;
  s += glow(x + 70, 300, 60) + `<rect x="${x + 64}" y="300" width="12" height="80" fill="#d8d1bf"/><ellipse cx="${x + 70}" cy="290" rx="6" ry="12" fill="${C.warm}"/>`;
  for (let i = 0; i < 3; i++) s += `<line x1="${x - 90 - i * 30}" y1="${300 + i * 40}" x2="${x - 40 - i * 30}" y2="${300 + i * 40}" stroke="${C.f5}" stroke-width="4" opacity="${.6 - i * .15}"/>`;
  return s;
};

// leitor no ambão, plano médio
S.reader = () => {
  let s = `<rect width="900" height="600" fill="${C.f1}"/><rect x="40" y="0" width="160" height="380" fill="${C.f5}" opacity=".35"/>` + glow(120, 200, 260, C.warm, .6);
  s += person(470, 760, 640, { fill: C.f3, head: C.skin, w: .5 });
  s += `<path d="M300 600L340 430H620L660 600Z" fill="${C.f4}"/><path d="M360 430L400 380H560L600 430Z" fill="#e2dccd"/>`;
  s += `<line x1="610" y1="430" x2="560" y2="250" stroke="#111" stroke-width="5"/><rect x="548" y="232" width="20" height="34" rx="9" fill="#111"/>`;
  return s;
};

// comunidade de frente, rostos
S.faces = (o = {}) => {
  let s = `<rect width="900" height="600" fill="${C.f1}"/>` + glow(700, 100, 300, C.warm, .5);
  const rows = [[340, 150, 9], [460, 230, 7], [640, 360, 5]];
  rows.forEach(([gy, h, n], ri) => {
    for (let i = 0; i < n; i++) {
      const x = (i + .5) * 900 / n + (ri % 2 ? 30 : -20), hi = o.focus && ri === 2 && i === o.focus;
      s += person(x, gy, h, { fill: hi ? C.f5 : [C.f2, C.f3, C.f3][ri], head: hi ? C.skin : undefined });
    }
  });
  if (o.hands) s += `<path d="M0 600L200 470H700L900 600Z" fill="${C.f2}"/>`;
  return s;
};

// mãos: hóstia, terço ou vela
S.hands = (o = {}) => {
  let s = `<rect width="900" height="600" fill="#121211"/>` + glow(460, 300, 300, C.warm, .7);
  s += `<rect x="-20" y="380" width="260" height="140" rx="40" fill="#1b1a17" transform="rotate(-12 110 450)"/>`;
  s += `<ellipse cx="420" cy="400" rx="190" ry="96" fill="${C.skin2}" transform="rotate(-8 420 400)"/>`;
  s += `<ellipse cx="480" cy="420" rx="185" ry="88" fill="${C.skin}" transform="rotate(6 480 420)"/>`;
  for (let i = 0; i < 4; i++) s += `<rect x="${590 + i * 8}" y="${360 + i * 26}" width="120" height="30" rx="15" fill="${C.skin}" transform="rotate(${-10 + i * 6} 600 ${370 + i * 26})"/>`;
  if (o.type === 'rosary') {
    for (let i = 0; i < 22; i++) { const a = Math.PI * (.1 + i / 14); s += `<circle cx="${r1(470 + 170 * Math.cos(a))}" cy="${r1(250 + 120 * Math.sin(a))}" r="11" fill="#2b2925" stroke="${C.f5}" stroke-width="2"/>`; }
    s += `<rect x="456" y="380" width="12" height="70" fill="#2b2925"/><rect x="438" y="398" width="48" height="12" fill="#2b2925"/>`;
  } else if (o.type === 'candle') {
    s += candle(470, 200, 220, 1.4);
  } else {
    s += glow(470, 370, 110, '#fff') + `<circle cx="470" cy="370" r="44" fill="#fbf6ea"/>`;
  }
  return s;
};

// detalhes pequenos
S.detail = (o = {}) => {
  let s = `<rect width="900" height="600" fill="${C.f1}"/>`;
  if (o.type === 'shoes') {
    for (let i = 0; i < 6; i++) s += `<line x1="0" y1="${360 + i * 50}" x2="900" y2="${330 + i * 60}" stroke="${C.f2}" stroke-width="3"/>`;
    s += `<path d="M260 420q0-60 70-60h80q40 0 40 60v40h-190Z" fill="#0d0d0c"/><path d="M480 440q0-60 70-60h80q40 0 40 60v40h-190Z" fill="#0d0d0c"/>`;
    s += `<rect x="300" y="160" width="60" height="210" fill="#e6e1d4"/><rect x="520" y="180" width="60" height="210" fill="#e6e1d4"/>`;
  } else if (o.type === 'book') {
    s += `<g transform="rotate(-6 450 300)"><rect x="200" y="120" width="500" height="360" fill="#e6e1d4"/><line x1="450" y1="120" x2="450" y2="480" stroke="#b9b3a5" stroke-width="3"/>`;
    for (let i = 0; i < 9; i++) s += `<rect x="230" y="${160 + i * 32}" width="${180 - (i % 3) * 30}" height="8" fill="#b9b3a5"/><rect x="480" y="${160 + i * 32}" width="${190 - (i % 2) * 50}" height="8" fill="#b9b3a5"/>`;
    s += `</g>`;
  } else if (o.type === 'key') {
    s += `<rect x="180" y="80" width="540" height="440" fill="${C.f3}"/><circle cx="520" cy="300" r="26" fill="#0d0d0c"/>`;
    s += `<circle cx="300" cy="320" r="46" fill="none" stroke="#c9a85e" stroke-width="16"/><rect x="340" y="312" width="150" height="16" fill="#c9a85e"/><rect x="460" y="328" width="14" height="30" fill="#c9a85e"/>`;
  } else if (o.type === 'flowers') {
    s += `<rect x="150" y="380" width="600" height="220" fill="${C.f4}"/><rect x="150" y="380" width="600" height="16" fill="#ddd7c8"/>`;
    for (let i = 0; i < 9; i++) s += `<line x1="${400 + i * 12}" y1="380" x2="${330 + i * 30}" y2="${150 + (i % 3) * 40}" stroke="#4d5a3c" stroke-width="5"/><circle cx="${330 + i * 30}" cy="${150 + (i % 3) * 40}" r="${26 + (i % 2) * 10}" fill="${i % 2 ? '#e8e2d3' : C.warm}" opacity=".9"/>`;
    s += person(760, 640, 420, { fill: C.f3 });
  }
  return s;
};

// silhueta contra luz
S.backlit = () => {
  let s = `<rect width="900" height="600" fill="#0b0b0a"/><rect x="300" y="40" width="300" height="420" fill="#f1e2bd"/>` + glow(450, 250, 380, C.warm, 1.4);
  s += `<path d="M300 40h300v420H300Z" fill="none" stroke="#0b0b0a" stroke-width="14"/><line x1="450" y1="40" x2="450" y2="460" stroke="#0b0b0a" stroke-width="10"/><line x1="300" y1="200" x2="600" y2="200" stroke="#0b0b0a" stroke-width="10"/>`;
  s += `<rect y="460" width="900" height="140" fill="#0b0b0a"/>` + person(420, 560, 300, { fill: '#050505' });
  s += `<path d="M372 360l-30 40 18 6 30-38z" fill="#050505"/>`;
  return s;
};

S.blank = () => `<rect width="900" height="600" fill="#151514"/><g stroke="#3a3936" stroke-width="1.5"><line x1="430" y1="300" x2="470" y2="300"/><line x1="450" y1="280" x2="450" y2="320"/></g>`;

/* ---------------- diagramas técnicos (currentColor) ---------------- */
const T = (x, y, t, o = {}) =>
  `<text x="${x}" y="${y}" fill="${o.fill || 'currentColor'}" font-family="JB Mono, monospace" font-size="${o.size || 20}" letter-spacing="1.5" text-anchor="${o.anchor || 'start'}" ${o.w ? `font-weight="${o.w}"` : ''}>${t}</text>`;
const hatch = `<pattern id="hatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="14" stroke="currentColor" stroke-width="2.5" opacity=".45"/></pattern>`;
const camDot = (x, y, a, l, ok = true) => {
  const rad = a * Math.PI / 180, L = 190, sp = .36;
  const p1 = [x + L * Math.cos(rad - sp), y + L * Math.sin(rad - sp)], p2 = [x + L * Math.cos(rad + sp), y + L * Math.sin(rad + sp)];
  return `<path d="M${x} ${y}L${r1(p1[0])} ${r1(p1[1])}L${r1(p2[0])} ${r1(p2[1])}Z" fill="${ok ? C.acc : 'currentColor'}" opacity="${ok ? .28 : .15}"/>` +
    `<circle cx="${x}" cy="${y}" r="22" fill="${ok ? C.acc : 'none'}" stroke="${ok ? C.acc : 'currentColor'}" stroke-width="3"/>` +
    T(x, y + 7, l, { anchor: 'middle', fill: ok ? C.ink : 'currentColor', size: 20, w: 700 });
};

S.floorplan = (o = {}) => {
  let s = `<defs>${hatch}</defs><g fill="none" stroke="currentColor">`;
  s += `<path d="M150 960V60H750V960H500M400 960H150" stroke-width="4"/>`;
  s += `<line x1="150" y1="300" x2="750" y2="300" stroke-width="2"/><line x1="150" y1="310" x2="750" y2="310" stroke-width="1" opacity=".5"/>`;
  s += `<rect x="390" y="150" width="120" height="50" stroke-width="2.5"/><circle cx="250" cy="245" r="18" stroke-width="2.5"/><rect x="430" y="80" width="40" height="34" stroke-width="2"/>`;
  for (let y = 350; y <= 900; y += 38) s += `<rect x="200" y="${y}" width="210" height="14" stroke-width="1.6" opacity=".55"/><rect x="490" y="${y}" width="210" height="14" stroke-width="1.6" opacity=".55"/>`;
  s += `</g>`;
  s += T(450, 182, 'ALTAR', { anchor: 'middle', size: 18 }) + T(250, 290, 'AMBÃO', { anchor: 'middle', size: 16 }) + T(450, 285, 'PRESBITÉRIO', { anchor: 'middle', size: 16 });
  s += T(450, 990, 'ENTRADA', { anchor: 'middle', size: 16 }) + `<text x="458" y="640" fill="currentColor" font-family="JB Mono" font-size="16" letter-spacing="6" transform="rotate(90 458 640)" text-anchor="middle">CORREDOR CENTRAL</text>`;
  (o.zones || []).forEach(z => s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="url(#hatch)" stroke="currentColor" stroke-width="2" stroke-dasharray="8 6"/>` + (z.l ? T(z.x + z.w / 2, z.y + z.h / 2 + 7, z.l, { anchor: 'middle', size: 18, w: 700 }) : ''));
  (o.cams || []).forEach(c => s += camDot(c.x, c.y, c.a, c.l, c.ok !== false));
  (o.dots || []).forEach(d => s += `<circle cx="${d.x}" cy="${d.y}" r="12" fill="${C.acc}"/>` + (d.l ? T(d.x + 20, d.y + 6, d.l, { size: 16 }) : ''));
  return s;
};

S.camera = () => {
  let s = `<g fill="none" stroke="currentColor" stroke-width="4">`;
  s += `<rect x="110" y="170" width="680" height="320" rx="44"/><path d="M350 170l30-62h140l30 62"/><rect x="160" y="138" width="110" height="32" rx="8"/>`;
  s += `<path d="M640 170v320M640 210q100 0 110 60"/><ellipse cx="705" cy="152" rx="36" ry="14"/><line x1="705" y1="152" x2="705" y2="170"/>`;
  [168, 142, 112, 80, 46].forEach((r, i) => s += `<circle cx="450" cy="330" r="${r}" stroke-width="${i === 0 ? 5 : 2.5}"/>`);
  for (let a = 0; a < 360; a += 6) { const rad = a * Math.PI / 180; s += `<line x1="${r1(450 + 142 * Math.cos(rad))}" y1="${r1(330 + 142 * Math.sin(rad))}" x2="${r1(450 + 156 * Math.cos(rad))}" y2="${r1(330 + 156 * Math.sin(rad))}" stroke-width="2"/>`; }
  s += `</g><circle cx="450" cy="330" r="30" fill="currentColor" opacity=".15"/><circle cx="430" cy="312" r="10" fill="currentColor" opacity=".5"/>`;
  return s;
};

S.phone = (o = {}) => {
  let s = `<rect x="60" y="20" width="480" height="960" rx="64" fill="none" stroke="currentColor" stroke-width="5"/>`;
  s += `<rect x="82" y="42" width="436" height="916" rx="46" fill="#0d0d0c"/><rect x="250" y="62" width="100" height="26" rx="13" fill="#000"/>`;
  s += `<rect x="82" y="150" width="436" height="600" fill="#1c1c1a"/>`;
  s += `<rect x="112" y="104" width="64" height="30" rx="15" fill="none" stroke="${o.hdr ? C.acc : '#888'}" stroke-width="2"/>` + T(144, 125, 'HDR', { anchor: 'middle', size: 15, fill: o.hdr ? C.acc : '#bbb' });
  s += `<rect x="424" y="104" width="64" height="30" rx="15" fill="none" stroke="#888" stroke-width="2"/>` + T(456, 125, 'RAW', { anchor: 'middle', size: 15, fill: '#bbb' });
  const lenses = o.lenses || ['.5', '1×', '2', '3'];
  lenses.forEach((l, i) => {
    const x = 300 + (i - (lenses.length - 1) / 2) * 76, on = l === (o.lens || '1×');
    s += `<circle cx="${x}" cy="800" r="28" fill="${on ? C.acc : '#262624'}"/>` + T(x, 807, l, { anchor: 'middle', size: 18, fill: on ? C.ink : '#ddd', w: 700 });
  });
  s += `<circle cx="300" cy="890" r="46" fill="none" stroke="#fff" stroke-width="6"/><circle cx="300" cy="890" r="36" fill="#fff"/>`;
  if (o.focus) {
    const [fx, fy] = o.focus;
    s += `<rect x="${fx - 55}" y="${fy - 55}" width="110" height="110" fill="none" stroke="${C.acc}" stroke-width="3"/>`;
    s += `<line x1="${fx + 80}" y1="${fy - 70}" x2="${fx + 80}" y2="${fy + 70}" stroke="${C.acc}" stroke-width="2"/><circle cx="${fx + 80}" cy="${fy + (o.sun || 0)}" r="13" fill="${C.acc}"/>`;
  }
  if (o.lock) s += `<rect x="215" y="166" width="170" height="34" rx="6" fill="${C.acc}"/>` + T(300, 189, 'AE/AF TRAVADO', { anchor: 'middle', size: 15, fill: C.ink, w: 700 });
  if (o.grid) s += `<g stroke="#fff" stroke-width="1.5" opacity=".5"><line x1="227" y1="150" x2="227" y2="750"/><line x1="373" y1="150" x2="373" y2="750"/><line x1="82" y1="350" x2="518" y2="350"/><line x1="82" y1="550" x2="518" y2="550"/></g>`;
  return s;
};

S.lensbar = (o = {}) => {
  const stops = o.stops || [.5, 1, 2, 3], max = o.max || 10, X = v => 70 + 760 * Math.log(v / .5) / Math.log(max / .5);
  let s = `<defs>${hatch}</defs><line x1="70" y1="120" x2="830" y2="120" stroke="currentColor" stroke-width="3"/>`;
  s += `<rect x="${X(stops[stops.length - 1])}" y="96" width="${830 - X(stops[stops.length - 1])}" height="48" fill="url(#hatch)" stroke="currentColor" stroke-width="2"/>`;
  s += T((X(stops[stops.length - 1]) + 830) / 2, 190, 'DIGITAL = RECORTE', { anchor: 'middle', size: 20, w: 700 });
  for (let i = 0; i < stops.length - 1; i++) s += `<line x1="${X(stops[i]) + 26}" y1="120" x2="${X(stops[i + 1]) - 26}" y2="120" stroke="currentColor" stroke-width="10" stroke-dasharray="2 10" opacity=".55"/>`;
  stops.forEach(v => s += `<circle cx="${X(v)}" cy="120" r="24" fill="${C.acc}"/>` + T(X(v), 128, (v < 1 ? '.5' : v) + '×', { anchor: 'middle', size: 18, fill: C.ink, w: 700 }));
  s += T(X(stops[0]), 60, 'LENTES DE VERDADE', { size: 20, w: 700 }) + T(830, 60, max + '×', { anchor: 'end', size: 20 });
  return s;
};

S.meter = (o = {}) => {
  let s = `<line x1="90" y1="110" x2="810" y2="110" stroke="currentColor" stroke-width="3"/>`;
  for (let v = -3; v <= 3; v += 1 / 3) {
    const x = 450 + v * 120, major = Math.abs(v - Math.round(v)) < .01;
    s += `<line x1="${r1(x)}" y1="${major ? 80 : 95}" x2="${r1(x)}" y2="110" stroke="currentColor" stroke-width="${major ? 3 : 1.5}"/>`;
    if (major) s += T(x, 66, (Math.round(v) > 0 ? '+' : '') + Math.round(v), { anchor: 'middle', size: 22, w: 700 });
  }
  const mx = 450 + (o.v || 0) * 120;
  s += `<path d="M${mx} 122l-16 26h32Z" fill="${C.acc}"/>` + (o.l ? T(mx, 182, o.l, { anchor: 'middle', size: 20, fill: C.acc, w: 700 }) : '');
  return s;
};

S.route = (o = {}) => {
  let s = `<g stroke="currentColor" stroke-width="44" opacity=".14"><line x1="0" y1="200" x2="900" y2="200"/><line x1="0" y1="520" x2="900" y2="520"/><line x1="0" y1="800" x2="900" y2="800"/><line x1="200" y1="0" x2="200" y2="900"/><line x1="560" y1="0" x2="560" y2="900"/><line x1="800" y1="0" x2="800" y2="900"/></g>`;
  s += `<rect x="70" y="80" width="90" height="90" fill="none" stroke="currentColor" stroke-width="3"/><path d="M70 80l45-40 45 40" fill="none" stroke="currentColor" stroke-width="3"/>` + T(115, 196, 'IGREJA', { anchor: 'middle', size: 16 });
  s += `<path d="M200 200H560V520H800V800" fill="none" stroke="currentColor" stroke-width="5" stroke-dasharray="14 10"/>`;
  s += `<path d="M330 200H460" stroke="${C.acc}" stroke-width="16"/><path d="M460 184l30 16-30 16Z" fill="${C.acc}"/>` + T(395, 172, 'PROCISSÃO', { anchor: 'middle', size: 18, fill: C.acc, w: 700 });
  s += `<path d="M640 120q160 0 160 200V440" fill="none" stroke="currentColor" stroke-width="3" stroke-dasharray="4 8"/>` + T(820, 150, 'VOCÊ, POR FORA', { size: 16 });
  [[560, 330, '1'], [690, 520, '2'], [800, 690, '3']].forEach(([x, y, l]) => s += `<circle cx="${x}" cy="${y}" r="28" fill="${C.acc}"/>` + T(x, y + 8, l, { anchor: 'middle', size: 24, fill: C.ink, w: 700 }));
  return s;
};

S.panning = () => {
  let s = `<line x1="80" y1="140" x2="820" y2="140" stroke="currentColor" stroke-width="2" stroke-dasharray="6 8"/>`;
  [200, 450, 700].forEach((x, i) => s += `<circle cx="${x}" cy="140" r="34" fill="currentColor" opacity="${.2 + i * .35}"/>`);
  s += `<path d="M760 124l40 16-40 16Z" fill="currentColor"/>` + T(450, 80, 'QUEM ANDA', { anchor: 'middle', size: 20, w: 700 });
  s += `<circle cx="450" cy="430" r="26" fill="${C.acc}"/>`;
  [200, 450, 700].forEach(x => s += `<line x1="450" y1="430" x2="${x}" y2="180" stroke="${C.acc}" stroke-width="2" opacity=".6"/>`);
  s += `<path d="M330 360A160 160 0 0 1 570 360" fill="none" stroke="${C.acc}" stroke-width="5"/><path d="M560 340l22 26-34 6Z" fill="${C.acc}"/>`;
  s += T(450, 500, 'VOCÊ GIRA O CORPO JUNTO · 1/30s', { anchor: 'middle', size: 20, fill: C.acc, w: 700 });
  return s;
};

S.silho = () => {
  let s = `<rect x="40" y="120" width="120" height="260" fill="${C.acc}" opacity=".9"/>` + T(100, 420, 'LUZ', { anchor: 'middle', size: 20, w: 700 });
  for (let i = 0; i < 5; i++) s += `<line x1="170" y1="${150 + i * 50}" x2="${300 + i * 4}" y2="${170 + i * 44}" stroke="${C.acc}" stroke-width="3" opacity=".7"/>`;
  s += `<g fill="currentColor"><circle cx="420" cy="200" r="30"/><path d="M380 380V260q0-28 40-28t40 28v120Z"/></g>` + T(420, 420, 'PESSOA', { anchor: 'middle', size: 20, w: 700 });
  s += `<line x1="740" y1="250" x2="470" y2="250" stroke="currentColor" stroke-width="2" stroke-dasharray="6 8"/>`;
  s += `<rect x="740" y="222" width="90" height="58" rx="8" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="740" cy="251" r="18" fill="none" stroke="currentColor" stroke-width="4"/>` + T(785, 320, 'VOCÊ', { anchor: 'middle', size: 20, w: 700 });
  s += T(450, 490, 'LUZ ATRÁS DA PESSOA · VOCÊ DO LADO OPOSTO', { anchor: 'middle', size: 18 });
  return s;
};

S.height = (o = {}) => {
  const ys = [330, 210, 120], y = ys[o.level ?? 1];
  let s = `<g fill="none" stroke="currentColor" stroke-width="3" opacity=".45"><circle cx="110" cy="70" r="28"/><path d="M110 98v150M110 248l-40 150M110 248l40 150M110 140l-50 60M110 140l50 60"/></g>`;
  s += `<line x1="0" y1="400" x2="300" y2="400" stroke="currentColor" stroke-width="2"/>`;
  s += `<rect x="150" y="${y - 20}" width="56" height="40" rx="6" fill="${C.acc}"/><circle cx="206" cy="${y}" r="12" fill="${C.ink}"/>`;
  s += `<line x1="218" y1="${y}" x2="295" y2="${y + (o.tilt || 0)}" stroke="${C.acc}" stroke-width="3" stroke-dasharray="6 6"/>`;
  return s;
};

S.sensor = () => {
  let s = `<rect x="60" y="40" width="780" height="520" fill="currentColor" opacity=".08"/>`;
  s += `<rect x="60" y="40" width="780" height="520" fill="none" stroke="currentColor" stroke-width="3"/>`;
  s += `<rect x="411" y="262" width="78" height="52" fill="none" stroke="${C.acc}" stroke-width="4"/>`;
  s += `<rect x="60" y="40" width="780" height="520" fill="#000" opacity=".35"/><rect x="411" y="262" width="78" height="52" fill="none" stroke="${C.acc}" stroke-width="4"/>`;
  s += `<line x1="489" y1="262" x2="760" y2="70" stroke="${C.acc}" stroke-width="2" stroke-dasharray="6 6"/>`;
  s += T(760, 60, '10× DIGITAL USA SÓ ISTO', { anchor: 'end', size: 20, fill: C.acc, w: 700 });
  s += T(80, 590, 'A FOTO INTEIRA = 100% DO SENSOR', { size: 18 });
  return s;
};

S.contact = (o = {}) => {
  const list = ['nave', 'altar', 'faces', 'hands', 'reader', 'nave', 'procession', 'altar', 'faces', 'detail', 'hands', 'nave', 'backlit', 'faces', 'altar', 'reader', 'hands', 'detail', 'faces', 'nave'];
  const opts = [{}, {}, {}, { type: 'rosary' }, {}, { blocker: true }, {}, { elevate: true }, { focus: 2 }, { type: 'shoes' }, {}, {}, {}, { hands: 1 }, { chalice: 1 }, {}, { type: 'candle' }, { type: 'book' }, { focus: 1 }, {}];
  let s = `<rect width="900" height="1000" fill="#0f0f0e"/>`;
  list.forEach((k, i) => {
    const c = i % 4, r = Math.floor(i / 4), x = 40 + c * 210, y = 40 + r * 188;
    s += `<svg x="${x}" y="${y}" width="190" height="127" viewBox="0 0 900 600" preserveAspectRatio="xMidYMid slice">${S[k](opts[i])}</svg>`;
    s += T(x, y + 150, String(i + 1).padStart(2, '0') + 'A', { size: 14, fill: '#ffb347' });
    if ((o.x || []).includes(i)) s += `<path d="M${x + 60} ${y + 30}l70 70M${x + 130} ${y + 30}l-70 70" stroke="${C.acc}" stroke-width="5" stroke-linecap="round"/>`;
  });
  const k = o.pick ?? 8, c = k % 4, rr = Math.floor(k / 4), cx = 40 + c * 210 + 95, cy = 40 + rr * 188 + 64;
  s += `<path d="M${cx - 120} ${cy - 10}C${cx - 120} ${cy - 100} ${cx + 125} ${cy - 96} ${cx + 118} ${cy}S${cx - 70} ${cy + 104} ${cx - 116} ${cy + 20}" fill="none" stroke="${C.acc}" stroke-width="7" stroke-linecap="round"/>`;
  return s;
};

S.shake = () => {
  let s = `<g fill="none" stroke="currentColor" stroke-width="4"><rect x="90" y="140" width="250" height="160" rx="24"/><circle cx="215" cy="220" r="52"/></g>`;
  s += `<g fill="none" stroke="${C.acc}" stroke-width="4"><path d="M60 360q40-30 80 0t80 0 80 0 80 0"/></g>` + T(215, 400, 'BRAÇO ESTICADO = TREME', { anchor: 'middle', size: 18 });
  s += `<g fill="none" stroke="currentColor" stroke-width="4"><circle cx="660" cy="90" r="34"/><path d="M660 124v150M620 160l-30 50 70 20M700 160l30 50-70 20"/></g>`;
  s += `<rect x="620" y="200" width="80" height="54" rx="8" fill="${C.acc}"/>` + T(660, 320, 'COTOVELO COLADO NO CORPO', { anchor: 'middle', size: 18, fill: C.acc, w: 700 });
  return s;
};

/* ---------------- marcações (à mão, caneta amarela) ---------------- */
let SEED = 7;
const rnd = () => { SEED = (SEED * 9301 + 49297) % 233280; return SEED / 233280; };
function handCircle(x, y, r) {
  const a0 = rnd() * 6.28, turn = 6.28 * (1.08 + rnd() * .08), k = 2 + rnd(), ph = rnd() * 6;
  let d = '';
  for (let i = 0; i <= 48; i++) {
    const a = a0 + turn * i / 48, rr = r * (1 + .05 * Math.sin(k * a + ph) + .025 * i / 48);
    d += (i ? 'L' : 'M') + r1(x + rr * 1.06 * Math.cos(a)) + ' ' + r1(y + rr * .94 * Math.sin(a));
  }
  return `<path d="${d}"/>`;
}
function handArrow(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), b = (rnd() > .5 ? 1 : -1) * L * .14;
  const cx = (x1 + x2) / 2 - dy / L * b, cy = (y1 + y2) / 2 + dx / L * b;
  const tx = x2 - cx, ty = y2 - cy, tl = Math.hypot(tx, ty), ux = tx / tl, uy = ty / tl, h = 26;
  const w1 = [x2 - h * (ux * .87 - uy * .5), y2 - h * (uy * .87 + ux * .5)], w2 = [x2 - h * (ux * .87 + uy * .5), y2 - h * (uy * .87 - ux * .5)];
  return `<path d="M${x1} ${y1}Q${r1(cx)} ${r1(cy)} ${x2} ${y2}M${r1(w1[0])} ${r1(w1[1])}L${x2} ${y2}L${r1(w2[0])} ${r1(w2[1])}"/>`;
}
function marks(list = [], vb = '0 0 900 600') {
  const [, , W, H] = vb.split(' ').map(Number);
  const lab = (x, y, t, a = 'start') => `<text x="${x}" y="${y}" fill="${C.acc}" font-family="Caveat, cursive" font-size="44" font-weight="700" text-anchor="${a}" paint-order="stroke" stroke="#000" stroke-width="7" stroke-linejoin="round" transform="rotate(${r1(rnd() * 4 - 3)} ${x} ${y})">${t.charAt(0) + t.slice(1).toLowerCase()}</text>`;
  let s = `<g stroke="${C.acc}" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">`;
  let t = '';
  list.forEach(m => {
    if (m.t === 'thirds') s += `<g stroke-width="2" opacity=".75" stroke-dasharray="3 9">${[1, 2].map(i => `<line x1="${W * i / 3}" y1="0" x2="${W * i / 3}" y2="${H}"/><line x1="0" y1="${H * i / 3}" x2="${W}" y2="${H * i / 3}"/>`).join('')}</g>`;
    if (m.t === 'circle') { s += handCircle(m.x, m.y, m.r); if (m.l) t += lab(m.lx ?? m.x + m.r + 14, m.ly ?? m.y + 8, m.l, m.a); }
    if (m.t === 'arrow') { s += handArrow(m.x1, m.y1, m.x2, m.y2); if (m.l) t += lab(m.lx ?? m.x1, m.ly ?? m.y1 - 16, m.l, m.a); }
    if (m.t === 'x') { const k = m.s || 26; s += `<path d="M${m.x - k} ${m.y - k * .9}Q${m.x + 4} ${m.y - 6} ${m.x + k} ${m.y + k}M${m.x + k * .9} ${m.y - k}Q${m.x - 6} ${m.y + 4} ${m.x - k} ${m.y + k * 1.05}" stroke-width="8"/>`; if (m.l) t += lab(m.x + k + 12, m.y + 8, m.l, m.a); }
    if (m.t === 'box') { const j = () => r1(rnd() * 6 - 3); s += `<path d="M${m.x + j()} ${m.y + j()}L${m.x + m.w + j()} ${m.y + j()}L${m.x + m.w + j()} ${m.y + m.h + j()}L${m.x + j()} ${m.y + m.h + j()}Z" ${m.dash ? 'stroke-dasharray="16 12"' : ''}/>`; if (m.l) t += lab(m.x, m.y - 16, m.l); }
    if (m.t === 'line') { s += `<path d="M${m.x1} ${m.y1}Q${r1((m.x1 + m.x2) / 2)} ${r1((m.y1 + m.y2) / 2 + 6)} ${m.x2} ${m.y2}" ${m.dash ? 'stroke-dasharray="14 12"' : ''}/>`; if (m.l) t += lab(m.lx ?? m.x2, m.ly ?? m.y2 - 16, m.l, m.a); }
    if (m.t === 'text') t += lab(m.x, m.y, m.l, m.a);
  });
  return s + '</g>' + t;
}

function sceneSvg(key, o = {}, mk = [], extra = {}) {
  const vb = VB[key] || '0 0 900 600';
  let inner = S[key](o);
  if (extra.shake) inner = `<defs><filter id="sh${extra.id}"><feGaussianBlur stdDeviation="4 1.5"/></filter></defs><g filter="url(#sh${extra.id})">${inner}<g opacity=".5" transform="translate(18 -7)">${inner}</g></g>`;
  if (extra.tilt) inner = `<g transform="rotate(${extra.tilt} 450 300) scale(1.12) translate(-48 -32)">${inner}</g>`;
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" width="${vb.split(' ')[2]}" height="${vb.split(' ')[3]}" preserveAspectRatio="xMidYMid ${extra.meet ? 'meet' : 'slice'}">${inner}${marks(mk, vb)}</svg>`;
}

if (typeof module !== 'undefined') module.exports = { S, VB };
