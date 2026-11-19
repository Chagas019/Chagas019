import Link from 'next/link';
import { avatarStyle, CATEGORY_LABEL, fmtDateTime, initials, PRIORITY_LABEL } from '@/lib/ui/format';

export interface MailCardData {
  id: string;
  from_name: string | null;
  from_email: string;
  subject: string;
  snippet: string;
  received_at: string;
  is_unread?: boolean;
  summary?: {
    priority: string; category: string; summary: string; reason: string; recommended_action: string;
    needs_reply: boolean; deadline: string | null; bill_amount: string | null; is_bill: boolean; is_appointment: boolean;
  } | null;
}

export function PriorityBadge({ p }: { p: string }) {
  return <span className={`badge p-${p}`}>{PRIORITY_LABEL[p] ?? p}</span>;
}

export function MailCard({ m, detailed = false, index = 0, tz }: { m: MailCardData; detailed?: boolean; index?: number; tz?: string }) {
  const name = m.from_name || m.from_email;
  const s = m.summary;
  return (
    <Link href={`/mensagens/${m.id}`} className={`mail enter enter-${Math.min(6, index + 1)}`}>
      <div className="mail-top">
        <span className="avatar" style={avatarStyle(m.from_email)}>{initials(name)}</span>
        <div style={{ minWidth: 0 }}>
          <div className="mail-from">{name}</div>
          <div className="faint tiny" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.from_email}</div>
        </div>
        <span className="mail-date">{fmtDateTime(m.received_at, tz)}</span>
        {m.is_unread && <span className="unread-dot" aria-label="não lida" />}
      </div>
      <div className="mail-subject">{m.subject || '(sem assunto)'}</div>
      <p className="mail-summary">{s?.summary ?? m.snippet}</p>
      {s && (
        <div className="mail-meta">
          <PriorityBadge p={s.priority} />
          <span className="tag">{CATEGORY_LABEL[s.category] ?? s.category}</span>
          {s.needs_reply && <span className="tag">Responder</span>}
          {s.deadline && <span className="tag">Prazo {new Date(`${s.deadline}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>}
          {s.is_bill && s.bill_amount && <span className="tag">{s.bill_amount}</span>}
        </div>
      )}
      {s && detailed && (
        <>
          {s.recommended_action && <div className="mail-action"><span>→</span><span><b>Ação:</b> {s.recommended_action}</span></div>}
          {s.reason && <div className="mail-reason">Por que é importante: {s.reason}</div>}
        </>
      )}
      {!s && <div className="mail-meta"><span className="tag">Em análise…</span></div>}
    </Link>
  );
}
