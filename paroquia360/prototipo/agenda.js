/* Agenda — calendário mensal, eventos do dia e criação de evento. */
const { $, esc, icon, toast, state, save, TYPES, PASTORALS, fmtDate, fill, TODAY } = P360;
const params = new URLSearchParams(location.search);
const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const iso = d => d.toISOString().slice(0, 10);

$('#f-tipo').insertAdjacentHTML('beforeend', Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join(''));
$('#f-past').insertAdjacentHTML('beforeend', PASTORALS.map(p => `<option>${p}</option>`).join(''));
$('#efType').innerHTML = Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
$('#efPast').insertAdjacentHTML('beforeend', PASTORALS.map(p => `<option>${p}</option>`).join(''));
$('#legend').innerHTML = Object.entries(TYPES).map(([k, v]) => `<span class="ty-${k}">${v}</span>`).join('');

let selected = /^\d{4}-\d{2}-\d{2}$/.test(params.get('d') || '') ? params.get('d') : TODAY;
let month = selected.slice(0, 7);

const filtered = () => state.events.filter(e =>
  ($('#f-tipo').value === 'all' || e.type === $('#f-tipo').value) && ($('#f-past').value === 'all' || e.pastoral === $('#f-past').value));

function renderCal() {
  const [y, m] = month.split('-').map(Number), first = new Date(Date.UTC(y, m - 1, 1));
  $('#monthLabel').textContent = first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const start = new Date(first); start.setUTCDate(1 - first.getUTCDay());
  const byDay = {}; filtered().forEach(e => (byDay[e.date] ||= []).push(e));
  let html = DOW.map(d => `<div class="dow" role="columnheader">${d}</div>`).join('');
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); const s = iso(d), evs = byDay[s] || [];
    if (i === 35 && s.slice(0, 7) !== month) break;
    html += `<button class="day${s.slice(0, 7) !== month ? ' out' : ''}${s === TODAY ? ' today' : ''}" data-d="${s}" aria-pressed="${s === selected}"
      aria-label="${fmtDate(s)}${evs.length ? ', ' + evs.length + ' evento(s)' : ''}">
      <span class="n">${d.getUTCDate()}</span>
      <span class="evs">${evs.slice(0, 3).map(e => `<span class="chipev ty-${e.type}">${e.time} ${esc(e.title)}</span>`).join('')}</span>
      ${evs.length > 3 ? `<span class="more-n">+${evs.length - 3}</span>` : ''}</button>`;
  }
  $('#calGrid').innerHTML = html;
  $('#prev').disabled = month <= '2026-11'; $('#next').disabled = month >= '2026-12';
}

function renderDay() {
  const evs = filtered().filter(e => e.date === selected);
  $('#dayPanel').innerHTML = `<h3>${fmtDate(selected)}</h3>` + (evs.length ? evs.map(e => {
    const f = fill(e);
    return `<div class="ev-item ty-${e.type}">
      <b>${esc(e.title)}</b>
      <small>${e.time.replace(':', 'h')} · ${esc(e.place)}</small>
      <small>${TYPES[e.type]}${e.pastoral ? ' · ' + esc(e.pastoral) : ' · paróquia toda'}</small>
      ${e.slots.length ? `<div class="row"><span class="tag ${f.a < f.t ? 'warn' : 'ok'}">Escala ${f.a}/${f.t}</span><a class="btn sm" href="escalas.html?e=${e.id}">Abrir escala ${icon('arrow')}</a></div>` : ''}
    </div>`;
  }).join('') : `<p class="empty">Nada marcado neste dia.</p>`) +
    `<button class="btn" id="addHere" style="margin-top:8px">${icon('plus')}Adicionar neste dia</button>`;
}

function render() { renderCal(); renderDay(); }

$('#calGrid').addEventListener('click', ev => {
  const b = ev.target.closest('.day'); if (!b) return;
  selected = b.dataset.d; if (selected.slice(0, 7) !== month && selected >= '2026-11-01' && selected <= '2026-12-31') month = selected.slice(0, 7);
  history.replaceState(null, '', '?d=' + selected); render();
});
const shift = n => { const [y, m] = month.split('-').map(Number); month = iso(new Date(Date.UTC(y, m - 1 + n, 1))).slice(0, 7); render(); };
$('#prev').addEventListener('click', () => shift(-1));
$('#next').addEventListener('click', () => shift(1));
$('#todayBtn').addEventListener('click', () => { selected = TODAY; month = TODAY.slice(0, 7); render(); });
['#f-tipo', '#f-past'].forEach(s => $(s).addEventListener('change', render));

// ---------- novo evento ----------
const form = $('#efForm');
function openForm(date) {
  form.reset(); $('#efErr').textContent = '';
  form.date.value = date || selected; form.time.value = '19:00';
  $('#evForm').showModal(); form.title.focus();
}
$('#newEv').addEventListener('click', () => openForm());
$('#dayPanel').addEventListener('click', e => { if (e.target.closest('#addHere')) openForm(selected); });
form.type.addEventListener('change', () => { $('#efSlotsWrap').hidden = form.type.value !== 'mass'; });
$('#evForm').addEventListener('click', e => { if (e.target.closest('[data-close]') || e.target === $('#evForm')) $('#evForm').close(); });
form.addEventListener('submit', e => {
  const f = Object.fromEntries(new FormData(form));
  const err = !f.title.trim() ? 'Informe o título.' : !f.date ? 'Escolha a data.' : (f.date < '2026-11-01' || f.date > '2026-12-31') ? 'No protótipo, use datas de novembro ou dezembro de 2026.'
    : !f.time ? 'Informe o horário.' : !f.place.trim() ? 'Informe o local.' : '';
  if (err) { e.preventDefault(); $('#efErr').textContent = err; return; }
  const slots = f.type === 'mass' && f.slots ? [['Leitor', 3], ['Ministro', 4], ['Músico', 3], ['Coroinha', 2]].map(([role, qty]) => ({ role, qty, people: [] })) : [];
  state.events.push({ id: 'n' + Date.now(), date: f.date, time: f.time, type: f.type, title: f.title.trim(), place: f.place.trim(), pastoral: f.pastoral || null, slots });
  state.events.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  save(); selected = f.date; month = f.date.slice(0, 7); render();
  toast(slots.length ? 'Evento criado — escala aberta em Escalas' : 'Evento criado');
});
$('#resetDemo').addEventListener('click', () => P360.reset());
$('#efSlotsWrap').hidden = form.type.value !== 'mass';
render();
