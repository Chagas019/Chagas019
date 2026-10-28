import { motion } from 'framer-motion';
import { CalendarClock, MapPin, Users } from 'lucide-react';
import { coverage, isOpenSlot, scheduleStatus, SCHEDULE_STATUS, SLOT_STATUS } from '@/lib/domain';
import { useStore } from '@/lib/store';
import type { Schedule, ScheduleStatus, SlotStatus } from '@/lib/types';
import { capitalize, cn, fmt } from '@/lib/utils';
import { Avatar, Badge, Bar } from '../ui';

export function ScheduleStatusBadge({ status }: { status: ScheduleStatus }) {
  const s = SCHEDULE_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function SlotStatusBadge({ status, open }: { status: SlotStatus; open?: boolean }) {
  if (open && status === 'pendente') return <Badge tone="danger" dot>Vaga aberta</Badge>;
  const s = SLOT_STATUS[status];
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
}

export function ScheduleCard({ s, onClick, index = 0 }: { s: Schedule; onClick?: () => void; index?: number }) {
  const { roles, members } = useStore();
  const st = scheduleStatus(s);
  const cov = coverage(s);
  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.35 }}
      className="card group w-full p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-neon/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">{s.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
            <CalendarClock className="h-3.5 w-3.5" />
            {capitalize(fmt(s.date, "EEE, dd/MM"))} · {s.start}–{s.end}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
            <MapPin className="h-3.5 w-3.5" /> {s.location}
          </p>
        </div>
        <ScheduleStatusBadge status={st} />
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {s.slots.map((sl) => {
          const r = roles.find((x) => x.id === sl.roleId);
          const m = members.find((x) => x.id === sl.memberId);
          const open = isOpenSlot(sl);
          return (
            <span
              key={sl.id}
              title={`${r?.name}: ${m?.name ?? 'vaga aberta'}`}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-0.5 pr-2 text-[11px]',
                open ? 'border-danger/30 bg-danger/5 text-danger' : sl.status === 'confirmado' ? 'border-neon/20 bg-neon/5 text-ink' : 'border-warn/25 bg-warn/5 text-ink',
              )}
            >
              {m && !open ? <Avatar name={m.name} size={18} /> : <span className="ml-1 h-1.5 w-1.5 rounded-full bg-danger" />}
              {r?.name}
            </span>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Bar value={cov.pct} />
        <span className="flex shrink-0 items-center gap-1 text-xs text-ink-muted">
          <Users className="h-3.5 w-3.5" /> {cov.filled}/{cov.total}
        </span>
      </div>
    </motion.button>
  );
}
