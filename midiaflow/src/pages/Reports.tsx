import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Info, Lock, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { Bar as RBar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, Card, EmptyState, PageHeader, SectionTitle, Select } from '@/components/ui';
import { downloadCSV } from '@/lib/csv';
import { coverage, isOpenSlot } from '@/lib/domain';
import { PERIODS, periodRange, usePeriod, type PeriodKey } from '@/lib/period';
import { useStore } from '@/lib/store';
import { fmt } from '@/lib/utils';

const tip = { contentStyle: { background: '#10151D', border: '1px solid #252F3C', borderRadius: 14, fontSize: 12 }, cursor: { fill: 'rgba(255,255,255,0.03)' } };

export default function Reports() {
  const { schedules, roles, events, audit, members, can, parish, mode } = useStore();
  const { period, setPeriod } = usePeriod();
  const { from, to } = periodRange(period);
  const list = useMemo(() => schedules.filter((s) => s.date >= from && s.date <= to).sort((a, b) => a.date.localeCompare(b.date)), [schedules, from, to]);

  const totals = useMemo(() => {
    const slots = list.flatMap((s) => s.slots);
    const filled = slots.filter((x) => !isOpenSlot(x)).length;
    const responded = slots.filter((x) => x.memberId && x.status !== 'pendente').length;
    return {
      escalas: list.length,
      cobertura: slots.length ? Math.round((filled / slots.length) * 100) : 0,
      confirmacoes: slots.filter((x) => x.status === 'confirmado' && x.memberId).length,
      respostas: responded,
      abertas: slots.length - filled,
      eventos: events.filter((e) => e.date >= from && e.date <= to).length,
    };
  }, [list, events, from, to]);

  const byRole = useMemo(() => roles.map((r) => {
    const slots = list.flatMap((s) => s.slots.filter((x) => x.roleId === r.id));
    return { name: r.name, color: r.color, preenchidas: slots.filter((x) => !isOpenSlot(x)).length, abertas: slots.filter(isOpenSlot).length };
  }).filter((x) => x.preenchidas + x.abertas > 0), [list, roles]);

  const statusPie = useMemo(() => {
    const slots = list.flatMap((s) => s.slots).filter((x) => x.memberId);
    return [
      { name: 'Confirmado', value: slots.filter((x) => x.status === 'confirmado').length, color: '#5BFF9A' },
      { name: 'Pendente', value: slots.filter((x) => x.status === 'pendente').length, color: '#FFC857' },
      { name: 'Não poderá', value: slots.filter((x) => x.status === 'recusado').length, color: '#FF6B7A' },
      { name: 'Substituição', value: slots.filter((x) => x.status === 'substituicao').length, color: '#55B8FF' },
    ].filter((x) => x.value > 0);
  }, [list]);

  if (!can('view:reports')) return <EmptyState icon={Lock} title="Acesso restrito" body="Relatórios são visíveis para coordenadores e administradores." />;

  const exportCSV = () => {
    const rows: (string | number)[][] = [['Data', 'Início', 'Término', 'Celebração', 'Tipo', 'Local', 'Função', 'Integrante', 'Status']];
    list.forEach((s) => s.slots.forEach((sl) => rows.push([
      fmt(s.date, 'dd/MM/yyyy'), s.start, s.end, s.title, s.eventType, s.location,
      roles.find((r) => r.id === sl.roleId)?.name ?? '', members.find((m) => m.id === sl.memberId)?.name ?? 'VAGA ABERTA',
      isOpenSlot(sl) && !sl.memberId ? 'vaga aberta' : sl.status,
    ])));
    downloadCSV(`midiaflow-escalas-${from}-a-${to}.csv`, rows);
  };

  const kpis = [
    { label: 'Escalas no período', value: totals.escalas },
    { label: 'Cobertura', value: `${totals.cobertura}%` },
    { label: 'Confirmações', value: totals.confirmacoes },
    { label: 'Vagas abertas', value: totals.abertas },
    { label: 'Eventos atendidos', value: totals.eventos },
  ];

  return (
    <div>
      <PageHeader title="Relatórios" subtitle={`${parish.name} · ${fmt(from, 'dd/MM/yyyy')} a ${fmt(to, 'dd/MM/yyyy')}`} actions={<>
        <Select aria-label="Período do relatório" value={period} onChange={(e) => setPeriod(e.target.value as PeriodKey)} className="h-11 w-auto rounded-full">
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </Select>
        <Button icon={Download} onClick={exportCSV} disabled={!list.length}>CSV</Button>
        <Button icon={Printer} onClick={() => window.print()}>Imprimir</Button>
      </>} />

      {mode === 'demo' && (
      <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-electric/25 bg-electric/[0.05] p-3 text-sm text-electric">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        Dados demonstrativos: os números abaixo são calculados a partir das escalas fictícias desta demonstração, não de uma paróquia real.
      </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-2xl font-bold tracking-tight">{k.value}</p>
            <p className="mt-1 text-xs text-ink-muted">{k.label}</p>
          </Card>
        ))}
      </div>

      {list.length === 0 ? <EmptyState title="Sem escalas no período" body="Escolha outro período para ver os relatórios." /> : (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card>
            <SectionTitle title="Participação por função" subtitle="Vagas preenchidas e abertas" />
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byRole} margin={{ left: -20, right: 4 }}>
                  <CartesianGrid stroke="#252F3C" strokeDasharray="3 6" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#96A3B5', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fill: '#96A3B5', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip {...tip} />
                  <RBar dataKey="preenchidas" name="Preenchidas" stackId="a" fill="#5BFF9A" radius={[0, 0, 0, 0]} animationDuration={800} />
                  <RBar dataKey="abertas" name="Abertas" stackId="a" fill="#FF6B7A" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card>
            <SectionTitle title="Confirmações recebidas" subtitle={`${totals.respostas} respostas dos integrantes`} />
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3} stroke="none" animationDuration={800}>
                    {statusPie.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip {...tip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-xs">
              {statusPie.map((s) => <li key={s.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: s.color }} />{s.name}: <span className="text-ink">{s.value}</span></li>)}
            </ul>
          </Card>

          <Card className="lg:col-span-2 overflow-x-auto">
            <SectionTitle title="Escalas realizadas e previstas" />
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-ink-muted"><th className="pb-2 font-medium">Data</th><th className="pb-2 font-medium">Celebração</th><th className="pb-2 font-medium">Vagas</th><th className="pb-2 font-medium">Confirmadas</th><th className="pb-2 font-medium">Cobertura</th></tr></thead>
              <tbody>
                {list.map((s) => { const c = coverage(s); return (
                  <tr key={s.id} className="border-t border-line/50">
                    <td className="py-2">{fmt(s.date, 'dd/MM')} {s.start}</td><td className="py-2">{s.title}</td><td className="py-2">{c.filled}/{c.total}</td><td className="py-2">{c.confirmed}</td>
                    <td className={c.pct === 100 ? 'py-2 text-neon' : c.pct >= 70 ? 'py-2 text-warn' : 'py-2 text-danger'}>{c.pct}%</td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </Card>

          <Card className="lg:col-span-2">
            <SectionTitle title="Histórico de alterações" subtitle="Registro de auditoria das ações na plataforma" />
            <ol className="space-y-2">
              {audit.slice(0, 15).map((a) => (
                <li key={a.id} className="flex flex-col justify-between gap-1 border-b border-line/40 pb-2 text-sm last:border-0 sm:flex-row">
                  <span>{a.summary}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{a.actor} · {formatDistanceToNow(parseISO(a.at), { locale: ptBR, addSuffix: true })}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </div>
  );
}
