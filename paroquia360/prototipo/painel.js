/* Painel — lê os mesmos dados de exemplo das telas de Agenda e Escalas. */
const { $, esc, icon, toast, state, VOLUNTEERS, ROLES, TYPES, PASTORALS, fill, fmtDate, swapRequests, TODAY, initials } = P360;
const addDays = (d, n) => { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const upcoming = days => state.events.filter(e => e.date >= TODAY && e.date < addDays(TODAY, days));

// Card de voluntários
$('#volCount').textContent = VOLUNTEERS.length;
$('#volSub').textContent = `em ${new Set(VOLUNTEERS.flatMap(v => v.roles.map(r => ROLES[r]))).size} pastorais`;
$('#faces').innerHTML = VOLUNTEERS.slice(0, 3).map(v => `<span>${initials(v.name)}</span>`).join('');

// Próxima missa com escala
const next = state.events.find(e => e.date >= TODAY && e.slots.length);
function renderNext() {
  $('#nextMass').textContent = next.title;
  $('#nmWhen').textContent = `${fmtDate(next.date, { weekday: 'long', day: 'numeric', month: 'short' })}, ${next.time.replace(':', 'h')}`;
  $('#nmWhere').textContent = next.place;
  $('#nmGo').href = 'escalas.html?e=' + next.id;
  $('#roles').innerHTML = next.slots.map(s => {
    const c = s.people.filter(p => p.status === 'confirmed').length;
    return `<div class="role"><span style="min-width:78px">${esc(s.role)}</span><span class="bar"><i style="width:${c / s.qty * 100}%"></i></span><b title="confirmados / vagas">${c}/${s.qty}</b></div>`;
  }).join('');
}
renderNext();
$('#remind').addEventListener('click', () => {
  const n = next.slots.reduce((a, s) => a + s.people.filter(p => p.status === 'pending').length, 0);
  toast(n ? `Lembrete preparado para ${n} pessoa(s) sem resposta (envio real chega com as notificações do MVP)` : 'Todos já responderam');
});
$('#swapBtn').addEventListener('click', () => { location.href = 'escalas.html?f=swap'; });
$('#shareBtn').addEventListener('click', async () => {
  const text = `Escala — ${next.title}, ${fmtDate(next.date, { day: 'numeric', month: 'short' })} ${next.time}: ` +
    next.slots.map(s => `${s.role} ${s.people.filter(p => p.status === 'confirmed').length}/${s.qty}`).join(', ');
  try { if (navigator.share) await navigator.share({ title: 'Escala', text }); else { await navigator.clipboard.writeText(text); toast('Resumo da escala copiado'); } }
  catch { toast('Compartilhamento cancelado'); }
});
$('#parish').addEventListener('click', () => toast('Você tem acesso a 1 paróquia neste exemplo'));

// KPIs
const week = upcoming(7), masses = week.filter(e => e.type === 'mass');
$('#kMass').textContent = masses.length;
const incomplete = masses.filter(e => { const f = fill(e); return f.a < f.t; }).length;
$('#kMassT').textContent = incomplete ? `${incomplete} com escala incompleta` : 'todas com escala completa';
const tot = masses.reduce((a, e) => { const f = fill(e); a.t += f.a; a.c += f.c; return a; }, { t: 0, c: 0 });
$('#kConf').textContent = tot.t ? Math.round(tot.c / tot.t * 100) + '%' : '–';
$('#kConfT').textContent = `${tot.c} de ${tot.t} escalados`;
const monthEv = state.events.filter(e => e.date.slice(0, 7) === TODAY.slice(0, 7));
$('#kPast').textContent = new Set(monthEv.map(e => e.pastoral).filter(Boolean)).size;
$('#kPastT').textContent = `de ${PASTORALS.length} cadastradas`;
$('#kSwap').textContent = swapRequests().filter(x => x.e.date >= TODAY).length;

// Próximos compromissos (filtros do topo)
function renderEvents() {
  const p = $('#f-past').value, ty = $('#f-tipo').value, per = +$('#f-per').value;
  const rows = upcoming(per).filter(e => (p === 'all' || e.pastoral === p) && (ty === 'all' || e.type === ty)).slice(0, 6);
  $('#events').innerHTML = rows.length ? rows.map(e => {
    const f = fill(e);
    const tag = e.slots.length ? (f.a < f.t ? `<span class="tag ${f.t - f.a > 2 ? 'bad' : 'warn'}">Escala ${f.a}/${f.t}</span>` : '<span class="tag ok">Escala completa</span>')
      : `<span class="tag">${TYPES[e.type]}</span>`;
    return `<li><a class="row-link" href="${e.slots.length ? 'escalas.html?e=' + e.id : 'agenda.html?d=' + e.date}"><div class="date"><b>${e.date.slice(8)}</b><small>${fmtDate(e.date, { month: 'short' }).replace('.', '')}</small></div><div class="t"><b>${esc(e.title)}</b><small>${esc(e.place)} · ${e.time.replace(':', 'h')}${e.pastoral ? ' · ' + esc(e.pastoral) : ''}</small></div>${tag}</a></li>`;
  }).join('') : '<li class="empty">Nada encontrado com esses filtros.</li>';
}
['#f-past', '#f-tipo', '#f-per'].forEach(s => $(s).addEventListener('change', renderEvents));
renderEvents();

// Preciso de ajuda: vagas abertas nos próximos 30 dias
const needs = [];
upcoming(30).forEach(e => e.slots.forEach(s => { const gap = s.qty - s.people.length; if (gap > 0) needs.push({ e, s, gap }); }));
needs.sort((a, b) => b.gap - a.gap || a.e.date.localeCompare(b.e.date));
$('#needs').innerHTML = needs.slice(0, 4).map((n, i) => `<div class="need"><div><b>${n.gap} × ${esc(n.s.role)}</b><small>${esc(ROLES[n.s.role])} · ${esc(n.e.title)} · ${fmtDate(n.e.date, { day: '2-digit', month: 'short' })}</small></div><button class="btn-gold" data-need="${i}" aria-pressed="false">Posso ajudar</button></div>`).join('')
  || '<p>Nenhuma vaga aberta nos próximos 30 dias.</p>';
$('#needs').addEventListener('click', e => {
  const b = e.target.closest('[data-need]'); if (!b) return;
  const on = b.getAttribute('aria-pressed') !== 'true';
  b.setAttribute('aria-pressed', on); b.textContent = on ? 'Você se ofereceu ✓' : 'Posso ajudar';
  toast(on ? 'A coordenação verá sua oferta na tela de Escalas' : 'Oferta retirada');
});

// Gráfico: % de vagas preenchidas por semana
const weeks = [...Array(6)].map((_, i) => {
  const from = addDays(TODAY, i * 7), evs = state.events.filter(e => e.date >= from && e.date < addDays(from, 7) && e.slots.length);
  const f = evs.reduce((a, e) => { const x = fill(e); a.a += x.a; a.t += x.t; return a; }, { a: 0, t: 0 });
  return { label: fmtDate(from, { day: '2-digit', month: '2-digit' }), pct: f.t ? Math.round(f.a / f.t * 100) : 0 };
});
$('#bars').setAttribute('aria-label', 'Vagas preenchidas por semana: ' + weeks.map(w => `${w.label} ${w.pct}%`).join(', '));
$('#bars').innerHTML = weeks.map(w => `<div><span class="bar-v">${w.pct}%</span><i style="height:${w.pct}%"></i><small>${w.label}</small></div>`).join('');
