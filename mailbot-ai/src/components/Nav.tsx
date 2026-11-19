'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconChart, IconChat, IconGear, IconHome, IconInbox, IconStar } from './Icons';
import { LogoMark } from './Mascot';

const ITEMS = [
  { href: '/', label: 'Início', Icon: IconHome },
  { href: '/importantes', label: 'Importantes', Icon: IconStar },
  { href: '/chat', label: 'Chat AI', Icon: IconChat },
  { href: '/mensagens', label: 'Mensagens', Icon: IconInbox },
  { href: '/relatorios', label: 'Relatórios', Icon: IconChart },
];

function active(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href);
}

export function Sidebar() {
  const path = usePathname();
  return (
    <nav className="sidebar" aria-label="Navegação principal">
      <Link href="/" className="brand"><LogoMark size={34} /><span>MAILBOT AI<small>Assistente de e-mails</small></span></Link>
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="nav-link" aria-current={active(path, href) ? 'page' : undefined}><Icon />{label}</Link>
      ))}
      <div className="spacer" />
      <Link href="/configuracoes" className="nav-link" aria-current={active(path, '/configuracoes') ? 'page' : undefined}><IconGear />Configurações</Link>
    </nav>
  );
}

export function TabBar() {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Navegação">
      {ITEMS.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className="tab" aria-current={active(path, href) ? 'page' : undefined}><Icon />{label}</Link>
      ))}
    </nav>
  );
}
