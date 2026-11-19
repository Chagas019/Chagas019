import Link from 'next/link';
import { MailCard } from '@/components/MailCard';
import { Empty } from '@/components/Empty';
import { CARD_COLS, pageContext, SUMMARY_COLS, toCards } from '@/lib/server/queries';

export const dynamic = 'force-dynamic';

const TABS = [
  { slug: 'urgentes', label: 'Urgentes' },
  { slug: 'responder', label: 'Precisam de resposta' },
  { slug: 'trabalho', label: 'Trabalho' },
  { slug: 'financeiro', label: 'Financeiro' },
  { slug: 'pessoal', label: 'Pessoais' },
  { slug: 'compromissos', label: 'Compromissos' },
  { slug: 'informativos', label: 'Informativos' },
] as const;

export default async function Importantes({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const tab = TABS.find((t) => t.slug === c) ?? TABS[0];
  const { sb, tz } = await pageContext();

  let q = sb.from('emails').select(`${CARD_COLS},email_summaries!inner(${SUMMARY_COLS})`).eq('is_sent', false);
  if (tab.slug === 'urgentes') q = q.eq('email_summaries.priority', 'urgente');
  else if (tab.slug === 'responder') q = q.eq('email_summaries.needs_reply', true).neq('email_summaries.priority', 'spam');
  else q = q.eq('email_summaries.category', tab.slug).neq('email_summaries.priority', 'spam');
  const { data } = await q.order('received_at', { ascending: false }).limit(50);
  const items = toCards(data);

  return (
    <div className="page">
      <div className="topbar"><h1>Importantes</h1></div>
      <nav className="chips" aria-label="Categorias">
        {TABS.map((t) => <Link key={t.slug} href={`/importantes?c=${t.slug}`} className="chip" aria-current={t.slug === tab.slug ? 'true' : undefined}>{t.label}</Link>)}
      </nav>
      {items.length ? (
        <div className="mail-list">{items.map((m, i) => <MailCard key={m.id} m={m} index={i} tz={tz} detailed />)}</div>
      ) : (
        <Empty title={`Nada em ${tab.label.toLowerCase()}`} text="Quando o MAIL TRIAGE identificar mensagens desta categoria, elas aparecem aqui." />
      )}
    </div>
  );
}
