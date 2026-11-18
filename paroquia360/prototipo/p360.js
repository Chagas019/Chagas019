/* Paróquia360 — base compartilhada do protótipo: ícones, navegação, tema, aviso e DADOS DE EXEMPLO.
   Nada aqui é dado real. O estado fica só no navegador de quem testa (localStorage). */
(function () {
const SPRITE = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="home" viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></symbol>
  <symbol id="cal" viewBox="0 0 24 24"><rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></symbol>
  <symbol id="swap" viewBox="0 0 24 24"><path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/></symbol>
  <symbol id="users" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.7 2.8 2.4 3 5.2"/></symbol>
  <symbol id="hand" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.2-9.3C1.6 8.3 3.6 5 7 5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.4 0 5.4 3.3 4.2 6.7C19.5 16.4 12 21 12 21z"/></symbol>
  <symbol id="msg" viewBox="0 0 24 24"><path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4V6a1 1 0 0 1 1-1z"/><path d="M8 10h8M8 13h5"/></symbol>
  <symbol id="chart" viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></symbol>
  <symbol id="bell" viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 21h4"/></symbol>
  <symbol id="gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.7-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.6 15H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 9.7 4.3V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></symbol>
  <symbol id="moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></symbol>
  <symbol id="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
  <symbol id="arrow" viewBox="0 0 24 24"><path d="M7 17 17 7M8 7h9v9"/></symbol>
  <symbol id="arrowl" viewBox="0 0 24 24"><path d="M17 17 7 7M7 16V7h9"/></symbol>
  <symbol id="pin" viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/></symbol>
  <symbol id="clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
  <symbol id="check" viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></symbol>
  <symbol id="share" viewBox="0 0 24 24"><path d="M14 5 21 12l-7 7v-4c-6 0-9 1.5-11 5 .5-6 3.5-10 11-11z"/></symbol>
  <symbol id="layers" viewBox="0 0 24 24"><path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/></symbol>
  <symbol id="alert" viewBox="0 0 24 24"><path d="M12 3 2 20h20zM12 10v4M12 17v.5"/></symbol>
  <symbol id="plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="x" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>
  <symbol id="chevl" viewBox="0 0 24 24"><path d="m15 6-6 6 6 6"/></symbol>
  <symbol id="chevr" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></symbol>
  <symbol id="userplus" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.5 3.3-5.5 6.5-5.5s5.9 2 6.5 5.5M19 8v6M16 11h6"/></symbol>
  <symbol id="send" viewBox="0 0 24 24"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/></symbol>
</svg>`;
document.body.insertAdjacentHTML('afterbegin', SPRITE);

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon = (id, cls = 'i') => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;

/* ---------- aviso ---------- */
let toastEl;
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); toastEl.setAttribute('aria-live', 'polite'); document.body.append(toastEl); }
  toastEl.textContent = msg; toastEl.classList.add('show');
  clearTimeout(toastEl._h); toastEl._h = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------- tema ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  document.querySelectorAll('[data-theme-btn]').forEach(b => b.classList.toggle('on', b.dataset.themeBtn === t));
  try { localStorage.setItem('p360-theme', t); } catch {}
}
try { const s = localStorage.getItem('p360-theme'); if (s) document.documentElement.dataset.theme = s; } catch {}

/* ---------- navegação ---------- */
const NAV = [
  ['painel', 'index.html', 'home', 'Painel'],
  ['agenda', 'agenda.html', 'cal', 'Agenda'],
  ['escalas', 'escalas.html', 'swap', 'Escalas'],
  ['voluntarios', 'index.html#ajuda', 'users', 'Voluntários'],
  ['comunicacao', 'index.html#comunicados', 'msg', 'Comunicação'],
];
function renderRail(el) {
  const active = el.dataset.active;
  const theme = document.documentElement.dataset.theme || 'light';
  el.innerHTML = `
    <div class="rail-group">${NAV.map(([k, href, ic, label]) =>
      `<a class="rbtn${k === active ? ' on' : ''}" href="${href}" data-tip="${label}" aria-label="${label}"${k === active ? ' aria-current="page"' : ''}>${icon(ic)}</a>`).join('')}</div>
    <div class="rail-group extra">
      <div class="avatar" title="Você (perfil de exemplo: coordenação)">AP</div>
      <button class="rbtn" data-bell data-tip="Notificações" aria-label="Notificações">${icon('bell')}<span class="dot"></span></button>
    </div>
    <div class="rail-group">
      <a class="rbtn" href="index.html#relatorios" data-tip="Relatórios" aria-label="Relatórios">${icon('chart')}</a>
      <button class="rbtn${theme === 'dark' ? ' on' : ''}" data-theme-btn="dark" data-tip="Modo escuro" aria-label="Modo escuro">${icon('moon')}</button>
      <button class="rbtn${theme !== 'dark' ? ' on' : ''}" data-theme-btn="light" data-tip="Modo claro" aria-label="Modo claro">${icon('sun')}</button>
    </div>`;
  el.addEventListener('click', e => {
    const t = e.target.closest('[data-theme-btn]'); if (t) setTheme(t.dataset.themeBtn);
    const b = e.target.closest('[data-bell]');
    if (b) { b.querySelector('.dot')?.remove(); const n = swapRequests().length; toast(n ? `${n} pedido(s) de substituição aguardando você` : 'Nenhum aviso novo'); }
  });
}

/* ---------- dados de exemplo ---------- */
const PASTORALS = ['Liturgia', 'Música', 'PASCOM', 'Catequese'];
const ROLES = { // função -> pastoral
  'Leitor': 'Liturgia', 'Ministro': 'Liturgia', 'Coroinha': 'Liturgia', 'Músico': 'Música', 'Fotógrafo': 'PASCOM' };
const TYPES = { mass: 'Missa', meeting: 'Reunião', formation: 'Formação', retreat: 'Retiro', feast: 'Festa', procession: 'Procissão', special: 'Especial' };
// Nomes fictícios. disp = dias da semana disponíveis (0 = domingo). menor/consent = regra de menores.
const VOLUNTEERS = [
  ['v1','Marta A.',['Leitor','Ministro'],[0,6]], ['v2','João P.',['Leitor'],[0]], ['v3','Lúcia C.',['Leitor'],[0,3]],
  ['v4','Rafael T.',['Ministro'],[0,6]], ['v5','Helena M.',['Ministro'],[0]], ['v6','Paulo R.',['Ministro','Leitor'],[6]],
  ['v7','Teresa D.',['Músico'],[0,6]], ['v8','Caio B.',['Músico'],[0]], ['v9','Irene L.',['Músico'],[6,0]],
  ['v10','Pedro S.',['Coroinha'],[0],true,true], ['v11','Ana V.',['Coroinha'],[0,6],true,true], ['v12','Davi N.',['Coroinha'],[0],true,false],
  ['v13','Sofia G.',['Fotógrafo'],[0,6]], ['v14','Mateus F.',['Fotógrafo','Leitor'],[6]], ['v15','Clara E.',['Leitor','Músico'],[0,6]],
].map(([id, name, roles, disp, minor = false, consent = true]) => ({ id, name, roles, disp, minor, consent }));

function seed() {
  const ev = []; let n = 0;
  const add = (date, time, type, title, place, pastoral, slots) =>
    ev.push({ id: 'e' + (++n), date, time, type, title, place, pastoral, slots: slots || [] });
  const iso = d => d.toISOString().slice(0, 10);
  const pick = (role, k, skip) => VOLUNTEERS.filter(v => v.roles.includes(role) && v.consent && !skip.has(v.id)).slice(k % 2, (k % 2) + 9);
  const massSlots = (k, weekday) => {
    const used = new Set(), st = ['confirmed', 'confirmed', 'pending', 'confirmed', 'confirmed', 'confirmed', 'pending'];
    return [['Leitor', 3], ['Ministro', 4], ['Músico', 3], ['Coroinha', 2]].map(([role, qty], r) => {
      const fill = Math.max(0, qty - ((k + r) % 3 === 0 ? 1 : 0) - (r === 2 && k % 2 ? 1 : 0));
      const people = pick(role, k + r, used).filter(v => v.disp.includes(weekday)).slice(0, fill)
        .map((v, i) => { used.add(v.id); return { v: v.id, status: (k * 5 + r * 3 + i) % 19 === 4 ? 'swap_requested' : st[(k + r + i) % st.length] }; });
      return { role, qty, people };
    });
  };
  const start = new Date(Date.UTC(2026, 10, 1)), end = new Date(Date.UTC(2026, 11, 31));
  let k = 0;
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const wd = d.getUTCDay(), s = iso(d);
    if (wd === 0) { add(s, '07:00', 'mass', 'Missa Dominical', 'Matriz', 'Liturgia', massSlots(k++, 0)); add(s, '10:00', 'mass', 'Missa Dominical', 'Matriz', 'Liturgia', massSlots(k++, 0)); }
    if (wd === 6) add(s, '19:00', 'mass', 'Missa Vespertina', 'Matriz', 'Liturgia', massSlots(k++, 6));
    if (wd === 3) add(s, '20:00', 'meeting', 'Ensaio do coral', 'Igreja matriz', 'Música');
    if (wd === 2 && d.getUTCDate() <= 7) add(s, '20:00', 'meeting', 'Reunião de coordenadores', 'Salão paroquial', null);
    if (wd === 4 && d.getUTCDate() % 14 < 7) add(s, '20:00', 'meeting', 'Reunião da PASCOM', 'Sala da PASCOM', 'PASCOM');
  }
  add('2026-11-28', '08:00', 'formation', 'Formação de catequistas', 'Centro pastoral', 'Catequese');
  add('2026-11-29', '07:30', 'retreat', 'Retiro de Advento', 'Casa de retiros', null);
  add('2026-12-08', '18:00', 'procession', 'Procissão da Imaculada', 'Saída da matriz', 'Liturgia', [{ role: 'Fotógrafo', qty: 2, people: [] }]);
  add('2026-12-08', '19:00', 'feast', 'Festa da Imaculada Conceição', 'Praça da matriz', null);
  add('2026-12-24', '22:00', 'mass', 'Missa da Noite de Natal', 'Matriz', 'Liturgia', massSlots(3, 4));
  ev.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return { v: 3, events: ev };
}

const KEY = 'p360-demo';
let state;
try { state = JSON.parse(localStorage.getItem(KEY)); } catch {}
if (!state || state.v !== 3) state = seed();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

const vol = id => VOLUNTEERS.find(v => v.id === id);
const initials = name => name.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
const weekday = date => new Date(date + 'T12:00:00Z').getUTCDay();
const fmtDate = (date, opt = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(date + 'T12:00:00Z').toLocaleDateString('pt-BR', { timeZone: 'UTC', ...opt });
const fill = e => { let a = 0, t = 0, c = 0; e.slots.forEach(s => { t += s.qty; a += s.people.length; c += s.people.filter(p => p.status === 'confirmed').length; }); return { a, t, c }; };
function swapRequests() {
  const out = [];
  state.events.forEach(e => e.slots.forEach(s => s.people.forEach(p => { if (p.status === 'swap_requested') out.push({ e, s, p }); })));
  return out;
}
// "Hoje" do protótipo: data real, limitada ao período de exemplo.
const TODAY = (() => { const t = new Date().toISOString().slice(0, 10); return t < '2026-11-01' || t > '2026-12-31' ? '2026-11-17' : t; })();

window.P360 = { $, esc, icon, toast, setTheme, renderRail, state, save, reset: () => { try { localStorage.removeItem(KEY); } catch {} location.reload(); },
  VOLUNTEERS, ROLES, TYPES, PASTORALS, vol, initials, weekday, fmtDate, fill, swapRequests, TODAY };

document.querySelectorAll('nav.rail[data-active]').forEach(renderRail);
})();
