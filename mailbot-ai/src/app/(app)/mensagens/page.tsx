import Link from 'next/link';
import { MailCard } from '@/components/MailCard';
import { Empty } from '@/components/Empty';
import { IconSearch } from '@/components/Icons';
import { CARD_COLS, pageContext, SUMMARY_COLS, toCards } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';
const PAGE = 30;

const FILTERS = [
  { v: '', label: 'Todas' }, { v: 'nao-lidas', label: 'Não lidas' }, { v: 'urgente', label: 'Urgentes' }, { v: 'importante', label: 'Importantes' },
  { v: 'normal', label: 'Normais' }, { v: 'baixa', label: 'Baixa prioridade' }, { v: 'spam', label: 'Possível spam' }, { v: 'enviadas', label: 'Enviadas' },
];

export default async function Mensagens({ searchParams }: { searchParams: Promise<{ q?: string; f?: string; p?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? '').slice(0, 200).trim();
  const f = FILTERS.some((x) => x.v === sp.f) ? sp.f! : '';
  const page = Math.max(0, Number(sp.p) || 0);
  const { sb, tz } = await pageContext();

  const priority = ['urgente', 'importante', 'normal', 'baixa', 'spam'].includes(f);
  let query = sb.from('mailbot_emails').select(`${CARD_COLS},mailbot_email_summaries${priority ? '!inner' : ''}(${SUMMARY_COLS})`, { count: 'exact' });
  query = f === 'enviadas' ? query.eq('is_sent', true) : query.eq('is_sent', false);
  if (f === 'nao-lidas') query = query.eq('is_unread', true);
  if (priority) query = query.eq('mailbot_email_summaries.priority', f);
  if (q) query = query.textSearch('search', q, { type: 'websearch', config: 'portuguese' });
  const { data, count } = await query.order('received_at', { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
  const items = toCards(data);
  const link = (o: Record<string, string | number>) => `/mensagens?${new URLSearchParams(Object.entries({ q, f, ...o }).filter(([, v]) => String(v) !== '' && String(v) !== '0').map(([k, v]) => [k, String(v)]))}`;

  return (
    <div className="page">
      <div className="topbar"><h1>Todas as mensagens</h1><span className="small faint">{count ?? 0}</span></div>
      <form className="search" action="/mensagens" role="search" style={{ marginBottom: 12 }}>
        <IconSearch />
        <input className="input" name="q" defaultValue={q} placeholder="Buscar por assunto, remetente ou conteúdo" aria-label="Buscar mensagens" />
        {f && <input type="hidden" name="f" value={f} />}
      </form>
      <nav className="chips" aria-label="Filtros">
        {FILTERS.map((x) => <Link key={x.v} href={link({ f: x.v, p: 0 })} className="chip" aria-current={x.v === f ? 'true' : undefined}>{x.label}</Link>)}
      </nav>
      {items.length ? (
        <>
          <div className="mail-list">{items.map((m, i) => <MailCard key={m.id} m={m} index={i} tz={tz} />)}</div>
          <div className="pager">
            {page > 0 ? <Link className="btn btn-ghost btn-sm" href={link({ p: page - 1 })}>← Anteriores</Link> : <span />}
            {(count ?? 0) > (page + 1) * PAGE && <Link className="btn btn-ghost btn-sm" href={link({ p: page + 1 })}>Próximas →</Link>}
          </div>
        </>
      ) : (
        <Empty title={q ? 'Nada encontrado' : 'Nenhuma mensagem sincronizada'} text={q ? 'Tente outras palavras ou remova os filtros.' : 'Conecte o Gmail em Configurações e sincronize para ver suas mensagens aqui.'} />
      )}
    </div>
  );
}
