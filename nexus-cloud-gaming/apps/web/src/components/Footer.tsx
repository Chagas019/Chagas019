import Link from 'next/link';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-line pb-28 md:pb-10">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">Seu universo gamer. Em qualquer tela.</p>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-faint">
            Prévia de desenvolvimento. Os jogos listados ainda não são transmitidos; os estados de disponibilidade
            mostram exatamente o que existe hoje.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Navegar</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li><Link className="hover:text-ink" href="/catalogo">Catálogo</Link></li>
            <li><Link className="hover:text-ink" href="/sala-de-teste">Sala de teste do aparelho</Link></li>
            <li><Link className="hover:text-ink" href="/controle">Testar controle</Link></li>
            <li><Link className="hover:text-ink" href="/planos">Planos</Link></li>
            <li><Link className="hover:text-ink" href="/transparencia">O que já funciona</Link></li>
          </ul>
        </div>
        <div className="text-xs leading-relaxed text-faint">
          <h2 className="text-sm font-semibold text-ink">Direitos e privacidade</h2>
          <p className="mt-3">
            Marcas e nomes de plataformas pertencem aos seus donos. O NEXUS não é afiliado a Sony, Microsoft, Nintendo,
            Valve ou NVIDIA e não distribui ROMs, ISOs, BIOS ou arquivos protegidos.
          </p>
          <p className="mt-3">
            Nesta prévia nenhum dado pessoal é coletado: favoritos, histórico e preferências ficam só no seu aparelho (LGPD).
          </p>
        </div>
      </div>
    </footer>
  );
}
