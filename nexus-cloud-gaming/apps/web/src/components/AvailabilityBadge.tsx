import { AVAILABILITY_LABEL, type Availability } from '@nexus/core';
import { CircleCheck, CircleDashed, CircleX, ExternalLink } from 'lucide-react';

const STYLE: Record<Availability, { cls: string; Icon: typeof CircleCheck }> = {
  operacional: { cls: 'text-ok border-ok/40', Icon: CircleCheck },
  'em-breve': { cls: 'text-warn border-warn/40', Icon: CircleDashed },
  'servico-oficial': { cls: 'text-cyan border-cyan/40', Icon: ExternalLink },
  indisponivel: { cls: 'text-muted border-line-strong', Icon: CircleX },
};

export function AvailabilityBadge({ value }: { value: Availability }) {
  const { cls, Icon } = STYLE[value];
  return (
    <span className={`chip ${cls}`}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {AVAILABILITY_LABEL[value]}
    </span>
  );
}

export function DemoBadge() {
  return <span className="chip border-violet/50 text-[#c4b5fd]">Demo</span>;
}
