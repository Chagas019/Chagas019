import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, ClipboardList, Megaphone, Repeat, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useScheduleDetail } from '@/components/schedule/ScheduleDetail';
import { Button, Card, EmptyState, PageHeader, Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { AppNotification } from '@/lib/types';
import { cn } from '@/lib/utils';

const KIND: Record<AppNotification['kind'], { icon: typeof Bell; color: string }> = {
  confirmacao: { icon: CheckCircle2, color: '#5BFF9A' },
  recusa: { icon: AlertTriangle, color: '#FF6B7A' },
  substituicao: { icon: Repeat, color: '#55B8FF' },
  escala: { icon: ClipboardList, color: '#B98BFF' },
  aviso: { icon: Megaphone, color: '#FFC857' },
  sistema: { icon: Sparkles, color: '#96A3B5' },
};

export default function Notifications() {
  const { notifications, markAllRead, markRead } = useStore();
  const detail = useScheduleDetail();
  const [tab, setTab] = useState<'todas' | 'nao-lidas'>('todas');
  const list = tab === 'todas' ? notifications : notifications.filter((n) => !n.read);

  return (
    <div>
      <PageHeader title="Notificações" subtitle="Confirmações, pedidos de substituição e avisos da equipe"
        actions={<Button icon={CheckCheck} onClick={markAllRead} disabled={!notifications.some((n) => !n.read)}>Marcar todas como lidas</Button>} />
      <Segmented className="mb-5" value={tab} onChange={setTab} options={[{ value: 'todas', label: 'Todas' }, { value: 'nao-lidas', label: `Não lidas (${notifications.filter((n) => !n.read).length})` }]} />
      {list.length === 0 ? <EmptyState icon={Bell} title="Tudo em dia" body="Nenhuma notificação por aqui." /> : (
        <Card className="divide-y divide-line/50 p-0">
          {list.map((n) => {
            const k = KIND[n.kind];
            return (
              <button key={n.id} onClick={() => { markRead(n.id); if (n.scheduleId) detail.open(n.scheduleId); }}
                className={cn('flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]', !n.read && 'bg-neon/[0.025]')}>
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${k.color}14`, color: k.color }}><k.icon className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium">{n.title}{!n.read && <span className="h-1.5 w-1.5 rounded-full bg-neon" />}</span>
                  <span className="mt-0.5 block text-sm text-ink-muted">{n.body}</span>
                  <span className="mt-1 block text-xs text-ink-muted/80">{formatDistanceToNow(parseISO(n.createdAt), { locale: ptBR, addSuffix: true })}</span>
                </span>
              </button>
            );
          })}
        </Card>
      )}
      <p className="mt-4 text-xs text-ink-muted">
        Estas notificações aparecem dentro do MídiaFlow. Envio por e-mail e WhatsApp ainda não está configurado — veja o README para habilitar.
      </p>
    </div>
  );
}
