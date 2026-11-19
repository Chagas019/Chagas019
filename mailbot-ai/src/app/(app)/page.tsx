import Link from 'next/link';
import { Mascot } from '@/components/Mascot';
import { MailCard } from '@/components/MailCard';
import { SyncButton } from '@/components/SyncButton';
import { Empty } from '@/components/Empty';
import { IconChat, IconGear } from '@/components/Icons';
import { CARD_COLS, pageContext, SUMMARY_COLS, toCards } from '@/lib/server/queries';
import { localDate, localHour, startOfLocalDay } from '@/lib/agents/time';
import { relative } from '@/lib/ui/format';
import type { ReportContent } from '@/lib/agents/summary';

export const dynamic = 'force-dynamic';

function greeting(h: number) { return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; }

export default async function Home() {
  const { sb, tz, account, name } = await pageContext();
  const now = new Date();
  const today = localDate(now, tz);
  const since = startOfLocalDay(today, tz);
  const connected = account?.status === 'connected';

  const [total, important, report, pend] = await Promise.all([
    sb.from('mailbot_emails').select('id', { count: 'exact', head: true }).eq('is_sent', false),
    sb.from('mailbot_email_summaries').select('email_id', { count: 'exact', head: true }).in('priority', ['urgente', 'importante']),
    sb.from('mailbot_daily_reports').select('narrative,content,created_at').eq('kind', 'daily').eq('period_start', today).maybeSingle(),
    sb.from('mailbot_emails').select(`${CARD_COLS},mailbot_email_summaries!inner(${SUMMARY_COLS})`).eq('is_sent', false)
      .or('needs_reply.eq.true,priority.eq.urgente,is_bill.eq.true', { referencedTable: 'mailbot_email_summaries' })
      .gte('received_at', new Date(now.getTime() - 7 * 86400_000).toISOString()).order('received_at', { ascending: false }).limit(4),
  ]);
  const todayCount = await sb.from('mailbot_emails').select('id', { count: 'exact', head: true }).eq('is_sent', false).gte('received_at', since);
  const content = report.data?.content as ReportContent | undefined;
  const pending = toCards(pend.data);

  return (
    <div className="page">
      <div className="topbar">
        <h1>Início</h1>
        <div className="row">
          {connected && <SyncButton compact auto={!account?.initial_sync_done} />}
          <Link href="/configuracoes" className="icon-btn" aria-label="Configurações"><IconGear /></Link>
        </div>
      </div>

      <section className="hero enter">
        <div className="hero-art"><Mascot /></div>
        <div>
          <p className="small" style={{ marginBottom: 6 }}>{greeting(localHour(now, tz))}, {name} 👋</p>
          <h1>Sua caixa de entrada, sob controle da IA.</h1>
          <div className="row wrap small" style={{ marginTop: 12, gap: 8 }}>
            <span className={`status-dot ${connected ? '' : account?.status === 'reauth_required' ? 'warn' : 'off'}`} />
            <span className="muted">
              {connected ? `Gmail conectado · ${account!.email}` : account?.status === 'reauth_required' ? 'Reconecte o Gmail (autorização expirou)' : 'Gmail não conectado'}
            </span>
          </div>
          <p className="tiny faint" style={{ marginTop: 4 }}>Última sincronização: {relative(account?.last_sync_at ?? null)}</p>
          <Link href={connected ? '/chat' : '/configuracoes'} className="btn btn-block" style={{ marginTop: 16 }}>
            <IconChat width={18} height={18} /> {connected ? 'Conversar com a IA' : 'Conectar Gmail'}
          </Link>
        </div>
      </section>

      {account?.last_error && <div className="notice warn enter" style={{ marginTop: 12 }}>{account.last_error}</div>}

      <div className="grid grid-4" style={{ marginTop: 12 }}>
        <div className="stat enter enter-1"><b>{total.count ?? 0}</b><span>Mensagens analisadas</span></div>
        <div className="stat enter enter-2"><b>{important.count ?? 0}</b><span>Importantes</span></div>
        <div className="stat enter enter-3"><b>{todayCount.count ?? 0}</b><span>Recebidas hoje</span></div>
        <div className="stat enter enter-4"><b>{content?.needs_reply.length ?? pending.filter((p) => p.summary?.needs_reply).length}</b><span>Aguardam resposta</span></div>
      </div>

      <section className="section">
        <div className="section-head"><h2>Resumo inteligente do dia</h2><Link href="/relatorios" className="small muted">Relatórios</Link></div>
        {report.data ? (
          <div className="card enter">
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>{report.data.narrative}</p>
            {!!content?.top.length && (
              <ul className="list-plain" style={{ marginTop: 12 }}>
                {content.top.map((t) => (
                  <li key={t.id}><Link href={`/mensagens/${t.id}`} className="row between"><span className="small">{t.summary}</span><span className={`badge p-${t.priority}`}>{t.priority}</span></Link></li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Empty title="O resumo de hoje ainda não foi gerado" text={connected ? 'Ele é criado automaticamente no horário escolhido, ou agora mesmo em Relatórios.' : 'Conecte o Gmail para receber seu resumo diário.'}
            action={<Link href={connected ? '/relatorios' : '/configuracoes'} className="btn btn-sm">{connected ? 'Gerar agora' : 'Conectar Gmail'}</Link>} />
        )}
      </section>

      <section className="section">
        <div className="section-head"><h2>Pendências</h2><Link href="/importantes" className="small muted">Ver todas</Link></div>
        {pending.length ? (
          <div className="mail-list">{pending.map((m, i) => <MailCard key={m.id} m={m} index={i} tz={tz} detailed />)}</div>
        ) : (
          <Empty title="Nenhuma pendência" text="Nada urgente, sem cobranças e ninguém esperando sua resposta nos últimos 7 dias." />
        )}
      </section>
    </div>
  );
}
