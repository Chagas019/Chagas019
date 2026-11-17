import { getParish } from '@/lib/parish';
import { Rail } from '@/components/Rail';
import { initials } from '@/lib/format';

export default async function ParishLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { supabase, user, parish } = await getParish(slug);
  const { data: me } = await supabase.from('profiles').select('full_name').eq('user_id', user.id).maybeSingle();
  return (
    <div className="page">
      <header className="brandbar">
        <span><b>PARÓQUIA360</b> &nbsp;·&nbsp; {parish.name}</span>
        <span className="top-user">{me?.full_name || user.email}</span>
      </header>
      <div className="app">
        <Rail slug={parish.slug} initials={initials(me?.full_name || user.email || '?')} />
        <main className="shell">{children}</main>
      </div>
    </div>
  );
}
