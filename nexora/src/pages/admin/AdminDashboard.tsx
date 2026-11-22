import { Building2, CalendarCheck, Inbox, RotateCcw } from 'lucide-react';
import { useAllProperties, useLeads } from '@/hooks/useData';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { resetDemoData } from '@/services/properties';
import { resetDemoContent } from '@/services/content';
import { formatDateTime } from '@/lib/format';
import { writeJSON } from '@/lib/storage';
import { invalidate } from '@/services/query';
import { TLink } from '@/components/ui/TLink';

export default function AdminDashboard() {
  const { data: props = [] } = useAllProperties();
  const { data: leads = [], error } = useLeads();
  const { demoStaff } = useAuth();
  const toast = useToast();
  const visits = leads.filter((l) => l.kind === 'visita' && l.visitAt && new Date(l.visitAt) > new Date() && l.status !== 'descartado').sort((a, b) => a.visitAt!.localeCompare(b.visitAt!));
  const cards = [
    { label: 'Publicados', value: props.filter((p) => p.status === 'publicado').length, Icon: Building2, to: '/admin/imoveis?status=publicado' },
    { label: 'Rascunhos', value: props.filter((p) => p.status === 'rascunho').length, Icon: Building2, to: '/admin/imoveis?status=rascunho' },
    { label: 'Contatos novos', value: leads.filter((l) => l.status === 'novo').length, Icon: Inbox, to: '/admin/contatos?status=novo' },
    { label: 'Visitas a fazer', value: visits.length, Icon: CalendarCheck, to: '/admin/contatos?tipo=visita' },
  ];
  return (
    <div className="space-y-10">
      <h1 className="text-display-sm font-medium">Visão geral</h1>
      {error && <p className="text-sm text-danger">{error.message}</p>}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, Icon, to }) => (
          <li key={label}><TLink to={to} className="surface block p-5 transition hover:border-white/20"><Icon size={18} className="text-signal-soft" /><p className="mt-4 text-3xl font-medium tabular-nums">{value}</p><p className="text-sm text-mist">{label}</p></TLink></li>
        ))}
      </ul>
      <section>
        <h2 className="mb-3 text-lg font-medium">Próximas visitas</h2>
        {visits.length === 0 ? <p className="text-sm text-mist">Nenhuma visita agendada.</p> : (
          <ul className="surface divide-y divide-white/10">
            {visits.slice(0, 8).map((v) => <li key={v.id} className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm"><span>{formatDateTime(v.visitAt!)} · {v.visitMode === 'video' ? 'Por vídeo' : 'Presencial'}</span><span className="text-mist">{v.name} — {v.propertyName}</span></li>)}
          </ul>
        )}
      </section>
      {demoStaff && (
        <section className="surface p-5">
          <h2 className="font-medium">Dados de demonstração</h2>
          <p className="mt-1 text-sm text-mist">Desfaz as edições de imóveis e conteúdo e apaga os contatos de teste deste navegador.</p>
          <button type="button" className="btn-ghost mt-4" onClick={() => { resetDemoData(); resetDemoContent(); writeJSON('nexora:demo:leads', []); invalidate('leads'); toast.show('Dados de demonstração restaurados', { tone: 'success' }); }}><RotateCcw size={15} /> Restaurar dados originais</button>
        </section>
      )}
    </div>
  );
}
