// Componentes reutilizáveis. O logotipo é sempre o arquivo original, inserido como <img>.
const ROOT = document.currentScript.src.replace(/assets\/components\.js.*$/, '');
const LOGO = ROOT + 'assets/logo-original.png';
const EL = n => ROOT + '05-ELEMENTOS-GRAFICOS/' + n + '.svg';

function logo(size, opts = {}) {
  const pad = opts.pad ?? Math.round(size * 0.08);
  const cls = opts.plate === false ? '' : 'plate ' + (opts.marfim ? 'marfim' : '');
  const border = opts.border ? `box-shadow:inset 0 0 0 1px ${opts.border};` : '';
  const radius = opts.radius ? `border-radius:${opts.radius}px;` : '';
  return `<div class="${cls}" style="width:${size}px;height:${size}px;padding:${pad}px;${border}${radius}${opts.style || ''}">
    <img class="logo" src="${LOGO}" alt="Logotipo MAGISTER AUXILIUM (original)" style="width:100%;height:100%"></div>`;
}

const FIELDS = [['Nome', 'nome completo'], ['Cargo', 'função'], ['Telefone', '+55 (00) 00000-0000'], ['E-mail', 'e-mail institucional'], ['Endereço', 'endereço'], ['Site', 'site / @instagram']];

const CARDS = {
  'A-frente': () => `<div class="bc paper dark" style="display:grid;place-items:center">
      <div style="position:absolute;inset:14px;border:1px solid rgba(201,164,93,.55)"></div>
      <img src="${EL('estrela-8-pontas--dourado')}" style="position:absolute;width:16px;left:22px;top:22px">
      <img src="${EL('estrela-8-pontas--dourado')}" style="position:absolute;width:16px;right:22px;bottom:22px">
      ${logo(178, { radius: 2, border: 'rgba(185,135,50,.9)' })}
    </div>`,
  'A-verso': () => `<div class="bc paper preto" style="display:grid;grid-template-columns:1.25fr 1fr;color:var(--marfim)">
      <div style="padding:34px 30px;display:flex;flex-direction:column;justify-content:space-between">
        <div><div class="display" style="font-size:30px"><span class="field" style="font-size:30px;opacity:1">Nome</span></div>
        <div class="eyebrow foil" style="margin-top:10px;font-size:9px">[ Cargo ]</div></div>
        <div style="font:400 10.5px/1.9 var(--sans);opacity:.85">
          ${FIELDS.slice(2).map(f => `<div><span class="ouro" style="display:inline-block;width:62px;letter-spacing:.18em;font-size:8px;text-transform:uppercase">${f[0]}</span>[ ${f[1]} ]</div>`).join('')}
        </div></div>
      <div style="position:relative;background:var(--grafite);overflow:hidden">
        <div style="position:absolute;inset:0;background:url(${EL('padrao-dourado-transparente')}) 0 0/86px;opacity:.45"></div>
        <img src="${EL('circulo-aureo--dourado')}" style="position:absolute;width:250px;right:-60px;bottom:-70px;opacity:.9">
      </div></div>`,
  'B-frente': () => `<div class="bc paper" style="display:grid;place-items:center">
      <img src="${EL('curva-manto--dourado')}" style="position:absolute;width:340px;left:-120px;bottom:-150px;opacity:.55">
      <img src="${EL('curva-manto--verde')}" style="position:absolute;width:340px;right:-120px;top:-150px;opacity:.35;transform:rotate(180deg)">
      ${logo(184, { plate: false })}
    </div>`,
  'B-verso': () => `<div class="bc paper" style="display:grid;grid-template-columns:120px 1fr">
      <div style="position:relative;background:var(--petroleo);overflow:hidden">
        <div style="position:absolute;inset:0;background:url(${EL('padrao-turquesa-sobre-verde')}) 0 0/60px;opacity:.55"></div>
        <img src="${EL('estrela-8-pontas--dourado')}" style="position:absolute;width:34px;left:43px;top:129px">
      </div>
      <div style="padding:32px 32px;display:flex;flex-direction:column;justify-content:space-between">
        <div><div class="display petro" style="font-size:30px"><span class="field" style="font-size:30px;opacity:1">Nome</span></div>
        <div class="eyebrow gold" style="margin-top:10px;font-size:9px">[ Cargo ]</div>
        <div style="width:46px;height:1px;background:var(--dourado);margin-top:14px"></div></div>
        <div style="font:400 10.5px/1.9 var(--sans);color:var(--grafite)">
          ${FIELDS.slice(2).map(f => `<div><span class="petro" style="display:inline-block;width:62px;letter-spacing:.18em;font-size:8px;font-weight:600;text-transform:uppercase">${f[0]}</span>[ ${f[1]} ]</div>`).join('')}
        </div></div></div>`,
};

function card(id, scale = 1, style = '') {
  return `<div style="width:${525 * scale}px;height:${292 * scale}px;${style}"><div style="transform:scale(${scale});transform-origin:0 0;box-shadow:var(--shadow-card);width:525px;height:292px">${CARDS[id]()}</div></div>`;
}
// Borda dourada (hot stamping lateral) para pilhas
function stack(id, n, scale, opts = {}) {
  const w = 525 * scale, h = 292 * scale, layers = [];
  for (let i = n - 1; i >= 0; i--) {
    const top = i === 0;
    layers.push(`<div style="position:absolute;left:${i * (opts.dx ?? 0)}px;top:${i * (opts.dy ?? 3)}px;width:${w}px;height:${h}px;border-radius:3px;
      ${top ? '' : `background:${opts.edge || '#2a2826'};box-shadow:0 ${1 + i}px ${2 + i}px rgba(0,0,0,.25), inset 0 -1px 0 ${opts.gilt ? '#c9a45d' : 'rgba(255,255,255,.06)'}`}">
      ${top ? `<div style="transform:scale(${scale});transform-origin:0 0;width:525px;height:292px">${CARDS[id]()}</div>` : ''}</div>`);
  }
  return `<div style="position:relative;width:${w + n * (opts.dx ?? 0)}px;height:${h + n * (opts.dy ?? 3)}px;filter:drop-shadow(0 30px 30px rgba(0,0,0,.45))">${layers.join('')}</div>`;
}

document.querySelectorAll('[data-card]').forEach(el => { el.innerHTML = card(el.dataset.card, +(el.dataset.scale || 1), el.dataset.style || ''); });
document.querySelectorAll('[data-logo]').forEach(el => { el.innerHTML = logo(+el.dataset.logo, JSON.parse(el.dataset.opts || '{}')); });
document.querySelectorAll('[data-stack]').forEach(el => { el.innerHTML = stack(el.dataset.stack, +(el.dataset.n || 8), +(el.dataset.scale || 1), JSON.parse(el.dataset.opts || '{}')); });
