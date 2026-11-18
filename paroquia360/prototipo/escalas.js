/* Escalas — coordenação monta a escala, acompanha respostas e resolve trocas. */
const { $, esc, icon, toast, state, save, VOLUNTEERS, ROLES, vol, initials, weekday, fmtDate, fill, swapRequests, TODAY } = P360;
const params = new URLSearchParams(location.search);
const STATUS = { confirmed: 'Confirmado', pending: 'Sem resposta', swap_requested: 'Pediu troca', declined: 'Recusou' };
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

$('#f-role').insertAdjacentHTML('beforeend', Object.keys(ROLES).map(r => `<option>${r}</option>`).join(''));
if (params.get('f') === 'swap') { $('#f-st').value = 'swap'; $('#f-per').value = '60'; }

let current = params.get('e');

function visible() {
  const role = $('#f-role').value, st = $('#f-st').value, until = addDays(TODAY, +$('#f-per').value);
  return state.events.filter(e => e.slots.length && e.date >= TODAY && e.date <= until).filter(e => {
    const slots = e.slots.filter(s => role === 'all' || s.role === role);
    if (!slots.length) return false;
    if (st === 'gap') return slots.some(s => s.people.length < s.qty);
    if (st === 'pending') return slots.some(s => s.people.some(p => p.status === 'pending'));
    if (st === 'swap') return slots.some(s => s.people.some(p => p.status === 'swap_requested'));
    return true;
  });
}

function renderStrip() {
  const sw = swapRequests().filter(x => x.e.date >= TODAY);
  $('#swapStrip').innerHTML = sw.length ? `<div class="alert-strip">${icon('swap')}<span><b>${sw.length}</b> pedido(s) de troca aguardando substituto.</span>
    <button class="btn sm" id="showSwaps">Ver só esses</button></div>` : '';
  $('#showSwaps')?.addEventListener('click', () => { $('#f-st').value = 'swap'; $('#f-per').value = '60'; render(); });
}

function renderList() {
  const list = visible();
  if (!list.find(e => e.id === current)) current = list[0]?.id;
  $('#evList').innerHTML = list.length ? list.map(e => {
    const f = fill(e), pct = Math.round(f.c / f.t * 100);
    return `<button class="ev-card" role="listitem" data-id="${e.id}" aria-current="${e.id === current}">
      <span class="ring" style="--p:${pct}" title="${f.c} confirmados de ${f.t} vagas">${pct}%</span>
      <span class="t"><b>${esc(e.title)}</b><small>${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${e.time.replace(':', 'h')}</small></span>
      ${f.a < f.t ? `<span class="tag warn">${f.t - f.a} vaga${f.t - f.a > 1 ? 's' : ''}</span>` : '<span class="tag ok">Completa</span>'}
    </button>`;
  }).join('') : '<p class="empty">Nenhuma celebração com esses filtros.</p>';
}

function renderDetail() {
  const e = state.events.find(x => x.id === current);
  if (!e) { $('#detail').innerHTML = '<p class="empty">Selecione uma celebração.</p>'; return; }
  const f = fill(e), role = $('#f-role').value;
  $('#detail').innerHTML = `
    <div class="ev-head">
      <div><h2>${esc(e.title)}</h2>
        <div class="meta">${icon('clock')}${fmtDate(e.date)}, ${e.time.replace(':', 'h')}</div>
        <div class="meta">${icon('pin')}${esc(e.place)} · ${f.c} confirmados, ${f.a - f.c} aguardando, ${f.t - f.a} vagas</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" data-act="remind">${icon('bell')}Lembrar pendentes</button>
        <button class="btn primary" data-act="share">${icon('send')}Enviar escala</button>
      </div>
    </div>
    ${e.slots.map((s, si) => role !== 'all' && s.role !== role ? '' : `
      <div class="role-block">
        <header><b>${esc(s.role)}</b><small>${s.people.length}/${s.qty} · ${esc(ROLES[s.role])}</small></header>
        <div class="people">
          ${s.people.map((p, pi) => { const v = vol(p.v); return `
            <div class="person ${p.status === 'swap_requested' ? 'swap' : ''}">
              <span class="av">${initials(v.name)}</span>
              <span class="t"><b>${esc(v.name)}</b><small class="st-${p.status}">${STATUS[p.status]}</small></span>
              ${p.status === 'swap_requested' ? `<button class="btn sm" data-act="replace" data-s="${si}" data-p="${pi}">Substituir</button>` : ''}
              ${p.status === 'pending' ? `<button class="icon-btn" data-act="confirm" data-s="${si}" data-p="${pi}" aria-label="Registrar confirmação de ${esc(v.name)}" title="Registrar confirmação">${icon('check')}</button>` : ''}
              <button class="icon-btn" data-act="remove" data-s="${si}" data-p="${pi}" aria-label="Tirar ${esc(v.name)} da escala" title="Tirar da escala">${icon('x')}</button>
            </div>`; }).join('')}
          ${Array.from({ length: s.qty - s.people.length }, () => `<button class="slot-empty" data-act="add" data-s="${si}">${icon('userplus')}Escalar ${esc(s.role.toLowerCase())}</button>`).join('')}
        </div>
      </div>`).join('')}`;
}

function render() { renderStrip(); renderList(); renderDetail(); }

// ---------- seletor de voluntários ----------
let pick = null; // { si, pi? }
function openPicker(si, pi) {
  const e = state.events.find(x => x.id === current), s = e.slots[si], wd = weekday(e.date);
  pick = { si, pi };
  const busy = new Set(e.slots.flatMap(x => x.people.map(p => p.v)));
  const leaving = pi != null ? s.people[pi].v : null;
  const cands = VOLUNTEERS.filter(v => v.roles.includes(s.role) && v.id !== leaving).map(v => ({ v,
    reason: busy.has(v.id) ? 'já está nesta celebração' : v.minor && !v.consent ? 'menor sem consentimento do responsável' : !v.disp.includes(wd) ? 'indisponível neste dia' : '' }));
  const ok = cands.filter(c => !c.reason), no = cands.filter(c => c.reason);
  const row = ({ v, reason }) => `<button class="pick" data-v="${v.id}" ${reason ? 'disabled' : ''}>
      <span class="av">${initials(v.name)}</span>
      <span class="t"><b>${esc(v.name)}${v.minor ? ' <span class="tag">menor</span>' : ''}</b><small>${reason || 'disponível · ' + v.roles.join(', ')}</small></span>
      ${reason ? '' : icon('plus')}</button>`;
  $('#pkTitle').textContent = pi != null ? `Substituir ${vol(leaving).name}` : `Escalar ${s.role.toLowerCase()}`;
  $('#pkSub').textContent = `${e.title} · ${fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })} ${e.time.replace(':', 'h')}`;
  $('#pkBody').innerHTML = (ok.length ? `<div class="group-label">Disponíveis (${ok.length})</div>${ok.map(row).join('')}`
    : '<p class="empty">Ninguém disponível com essa função. Publique em "Preciso de ajuda" no painel.</p>') +
    (no.length ? `<div class="group-label">Indisponíveis</div>${no.map(row).join('')}` : '');
  $('#picker').showModal();
}
$('#pkBody').addEventListener('click', ev => {
  const b = ev.target.closest('.pick:not(:disabled)'); if (!b) return;
  const e = state.events.find(x => x.id === current), s = e.slots[pick.si], v = vol(b.dataset.v);
  if (pick.pi != null) { const old = vol(s.people[pick.pi].v); s.people[pick.pi] = { v: v.id, status: 'pending' }; toast(`${v.name} convidado no lugar de ${old.name}`); }
  else { s.people.push({ v: v.id, status: 'pending' }); toast(`${v.name} escalado — aguardando confirmação`); }
  save(); $('#picker').close(); render();
});
$('#picker').addEventListener('click', ev => { if (ev.target.closest('[data-close]') || ev.target === $('#picker')) $('#picker').close(); });

// ---------- ações ----------
$('#evList').addEventListener('click', ev => { const b = ev.target.closest('.ev-card'); if (!b) return; current = b.dataset.id; history.replaceState(null, '', '?e=' + current); renderList(); renderDetail(); });
$('#detail').addEventListener('click', async ev => {
  const b = ev.target.closest('[data-act]'); if (!b) return;
  const e = state.events.find(x => x.id === current), si = +b.dataset.s, pi = +b.dataset.p, act = b.dataset.act;
  if (act === 'add') return openPicker(si);
  if (act === 'replace') return openPicker(si, pi);
  if (act === 'confirm') { e.slots[si].people[pi].status = 'confirmed'; toast('Confirmação registrada'); }
  if (act === 'remove') { const p = e.slots[si].people.splice(pi, 1)[0]; toast(`${vol(p.v).name} saiu da escala`); }
  if (act === 'remind') { const n = e.slots.reduce((a, s) => a + s.people.filter(p => p.status === 'pending').length, 0); return toast(n ? `Lembrete preparado para ${n} pessoa(s) — o envio real chega com as notificações do MVP` : 'Todos já responderam'); }
  if (act === 'share') {
    const text = `${e.title} — ${fmtDate(e.date, { day: 'numeric', month: 'short' })} ${e.time}\n` + e.slots.map(s => `${s.role}: ${s.people.map(p => vol(p.v).name).join(', ') || '—'}`).join('\n');
    try { if (navigator.share) await navigator.share({ title: 'Escala', text }); else { await navigator.clipboard.writeText(text); toast('Escala copiada para enviar'); } } catch { toast('Envio cancelado'); }
    return;
  }
  save(); render();
});
['#f-role', '#f-st', '#f-per'].forEach(s => $(s).addEventListener('change', render));
$('#resetDemo').addEventListener('click', () => P360.reset());
render();
