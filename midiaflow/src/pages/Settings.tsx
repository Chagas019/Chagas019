import { Database, Mail, MessageCircle, RotateCcw, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Badge, Button, Card, ConfirmDialog, Field, Input, PageHeader, SectionTitle } from '@/components/ui';
import { ACCESS_LABEL, useStore } from '@/lib/store';
import { isSupabaseConfigured } from '@/lib/supabase';
import type { Period } from '@/lib/types';
import { cn, PERIOD_LABEL, WEEKDAYS } from '@/lib/utils';

export default function Settings() {
  const store = useStore();
  const { parish, me, can } = store;
  const [p, setP] = useState(parish);
  const [reset, setReset] = useState(false);
  const [av, setAv] = useState(me.availability);
  useEffect(() => setAv(me.availability), [me]);
  useEffect(() => {
    if (location.hash === '#disponibilidade') document.getElementById('disponibilidade')?.scrollIntoView({ behavior: 'smooth' });
  }, []);
  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  return (
    <div className="space-y-5">
      <PageHeader title="Configurações" subtitle={`Você está como ${ACCESS_LABEL[me.access].toLowerCase()}`} />

      <Card id="disponibilidade">
        <SectionTitle title="Minha disponibilidade" subtitle="A coordenação usa isso para montar as escalas" />
        <div className="flex flex-wrap gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <button key={d} aria-pressed={av.weekdays.includes(i)} onClick={() => setAv({ ...av, weekdays: toggle(av.weekdays, i) })}
              className={cn('h-10 w-12 rounded-xl border text-sm', av.weekdays.includes(i) ? 'border-neon/50 bg-neon/10 text-neon' : 'border-line text-ink-muted')}>{d}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(PERIOD_LABEL) as Period[]).map((x) => (
            <button key={x} aria-pressed={av.periods.includes(x)} onClick={() => setAv({ ...av, periods: toggle(av.periods, x) })}
              className={cn('h-9 rounded-full border px-4 text-sm', av.periods.includes(x) ? 'border-electric/50 bg-electric/10 text-electric' : 'border-line text-ink-muted')}>{PERIOD_LABEL[x]}</button>
          ))}
        </div>
        <Button className="mt-4" variant="primary" size="sm" onClick={() => { store.saveMember({ ...me, availability: av }); toast.success('Disponibilidade atualizada.'); }}>Salvar disponibilidade</Button>
      </Card>

      <Card>
        <SectionTitle title="Paróquia" subtitle={can('manage:parish') ? 'Identificação exibida na plataforma' : 'Apenas administradores podem alterar'} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Nome da paróquia"><Input disabled={!can('manage:parish')} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Cidade"><Input disabled={!can('manage:parish')} value={p.city} onChange={(e) => setP({ ...p, city: e.target.value })} /></Field>
          <Field label="Nome da PASCOM"><Input disabled={!can('manage:parish')} value={p.pascomName} onChange={(e) => setP({ ...p, pascomName: e.target.value })} /></Field>
        </div>
        {can('manage:parish') && (
          <Button className="mt-4" variant="primary" size="sm" onClick={() => {
            if (p.name.trim().length < 3) return toast.error('Informe o nome da paróquia.');
            store.updateParish({ name: p.name.trim(), city: p.city.trim(), pascomName: p.pascomName.trim() });
            toast.success('Dados da paróquia salvos.');
          }}>Salvar</Button>
        )}
      </Card>

      <Card>
        <SectionTitle title="Níveis de acesso" />
        <ul className="grid gap-3 sm:grid-cols-3">
          {[
            ['Administrador', 'Gerencia as configurações da paróquia e os usuários.'],
            ['Coordenador', 'Administra a equipe, as escalas e os eventos autorizados.'],
            ['Integrante', 'Consulta suas escalas, informa disponibilidade e confirma presença.'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-2xl border border-line bg-surface/50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-neon" />{t}</p>
              <p className="mt-1 text-sm text-ink-muted">{d}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title="Integrações" subtitle="Status real das conexões externas" />
        <ul className="space-y-2.5">
          <Integration icon={Database} name="Supabase (banco e login)" ok={isSupabaseConfigured} okText="Configurado" offText="Não configurado · modo demonstração" />
          <Integration icon={Mail} name="Notificações por e-mail" ok={false} offText="Não configurado" />
          <Integration icon={MessageCircle} name="Notificações por WhatsApp" ok={false} offText="Não configurado" />
        </ul>
        <p className="mt-3 text-xs text-ink-muted">O README explica como conectar cada serviço. Nenhuma mensagem é enviada enquanto a integração não estiver configurada.</p>
      </Card>

      {!isSupabaseConfigured && (
        <Card className="border-danger/20">
          <SectionTitle title="Dados da demonstração" subtitle="Os dados ficam apenas no armazenamento deste navegador" />
          <Button variant="danger" size="sm" icon={RotateCcw} onClick={() => setReset(true)}>Restaurar dados de exemplo</Button>
        </Card>
      )}
      <ConfirmDialog open={reset} onOpenChange={setReset} title="Restaurar demonstração?" body="Todas as alterações feitas neste navegador serão substituídas pelos dados de exemplo." confirmLabel="Restaurar"
        onConfirm={() => { store.resetDemo(); toast.success('Dados de exemplo restaurados.'); }} />
    </div>
  );
}

function Integration({ icon: Icon, name, ok, okText = 'Conectado', offText }: { icon: typeof Mail; name: string; ok: boolean; okText?: string; offText: string }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface/40 px-4 py-3">
      <span className="flex items-center gap-3 text-sm"><Icon className="h-4 w-4 text-ink-muted" />{name}</span>
      <Badge tone={ok ? 'neon' : 'muted'} dot>{ok ? okText : offText}</Badge>
    </li>
  );
}
