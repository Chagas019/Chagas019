import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PriorityBadge } from '@/components/MailCard';
import { IconBack } from '@/components/Icons';
import { pageContext, SUMMARY_COLS } from '@/lib/server/queries';
import { avatarStyle, CATEGORY_LABEL, fmtFull, initials } from '@/lib/ui/format';

export const dynamic = 'force-dynamic';

export default async function Mensagem({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { sb, tz, account } = await pageContext();
  const { data: m } = await sb.from('mailbot_emails')
    .select(`id,gmail_id,thread_id,from_name,from_email,to_emails,subject,body_text,snippet,received_at,label_ids,mailbot_email_summaries(${SUMMARY_COLS},appointment_at)`)
    .eq('id', id).maybeSingle();
  if (!m) notFound();
  const s = (Array.isArray(m.mailbot_email_summaries) ? m.mailbot_email_summaries[0] : m.mailbot_email_summaries) as Record<string, string | boolean | number | null> | null;
  const name = m.from_name || m.from_email;
  const gmailUrl = `https://mail.google.com/mail/u/${encodeURIComponent(account?.email ?? '0')}/#all/${m.gmail_id}`;

  return (
    <div className="page">
      <div className="topbar"><Link href="/mensagens" className="icon-btn" aria-label="Voltar"><IconBack /></Link><a href={gmailUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Abrir no Gmail</a></div>
      <h1 className="enter" style={{ fontSize: 24, letterSpacing: '-0.02em', margin: '4px 0 14px' }}>{m.subject || '(sem assunto)'}</h1>
      <div className="row enter enter-1" style={{ marginBottom: 16 }}>
        <span className="avatar" style={avatarStyle(m.from_email)}>{initials(name)}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600 }}>{name}</div>
          <div className="tiny faint">{m.from_email} · {fmtFull(m.received_at, tz)}</div>
          {m.to_emails && <div className="tiny faint">Para: {m.to_emails}</div>}
        </div>
      </div>

      {s && (
        <div className="card enter enter-2" style={{ marginBottom: 12 }}>
          <h2 className="card-title">Análise do MAILBOT <PriorityBadge p={String(s.priority)} /></h2>
          <p style={{ margin: '0 0 10px', fontSize: 16 }}>{String(s.summary)}</p>
          <div className="mail-meta" style={{ marginTop: 0 }}>
            <span className="tag">{CATEGORY_LABEL[String(s.category)]}</span>
            <span className="tag">Relevância {String(s.relevance_score)}/100</span>
            {s.needs_reply && <span className="tag">Precisa de resposta</span>}
            {s.deadline && <span className="tag">Prazo {String(s.deadline)}</span>}
            {s.is_bill && <span className="tag">Cobrança {s.bill_amount ? `· ${s.bill_amount}` : ''}</span>}
            {s.is_appointment && <span className="tag">Compromisso {s.appointment_at ? `· ${fmtFull(String(s.appointment_at), tz)}` : ''}</span>}
          </div>
          {s.recommended_action && <div className="mail-action"><span>→</span><span><b>Ação recomendada:</b> {String(s.recommended_action)}</span></div>}
          {s.reason && <div className="mail-reason">Motivo: {String(s.reason)}</div>}
        </div>
      )}

      <div className="card enter enter-3">
        <h2 className="card-title">Conteúdo original</h2>
        <div className="email-body">{m.body_text || m.snippet || '(mensagem sem texto)'}</div>
      </div>
    </div>
  );
}
