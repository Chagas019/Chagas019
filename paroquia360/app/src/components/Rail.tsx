'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

export function Rail({ slug, initials }: { slug: string; initials: string }) {
  const path = usePathname();
  const base = `/p/${slug}`;
  const items = [
    [base, 'home', 'Painel'], [`${base}/agenda`, 'cal', 'Agenda'], [`${base}/escalas`, 'swap', 'Escalas'], [`${base}/equipe`, 'users', 'Equipe'],
  ] as const;
  return (
    <nav className="rail side" aria-label="Navegação principal">
      <div className="rail-group">
        {items.map(([href, icon, label]) => {
          const on = href === base ? path === base : path.startsWith(href);
          return (
            <Link key={href} href={href} className={`rbtn${on ? ' on' : ''}`} data-tip={label} aria-label={label} aria-current={on ? 'page' : undefined}>
              <Icon name={icon} />
            </Link>
          );
        })}
      </div>
      <div className="rail-group extra">
        <div className="avatar" title="Você">{initials}</div>
        <form action="/auth/sair" method="post">
          <button className="rbtn" data-tip="Sair" aria-label="Sair"><Icon name="out" /></button>
        </form>
      </div>
    </nav>
  );
}
