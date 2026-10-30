import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="mt-16 overflow-hidden border-t border-white/[0.06] pb-28 pt-10 sm:pb-12">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <div className="space-y-2">
          <Logo />
          <p className="text-sm text-fog-500">Sua criatividade merece um mundo inteiro.</p>
        </div>
        <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-[0.14em] text-fog-400">
          <Link href="/termos" className="hover:text-volt-500">Termos de uso</Link>
          <Link href="/privacidade" className="hover:text-volt-500">Privacidade</Link>
          <Link href="/diretrizes" className="hover:text-volt-500">Diretrizes da comunidade</Link>
        </nav>
      </div>
      <p aria-hidden className="text-outline mt-8 select-none text-center font-display text-[24vw] leading-[0.8]">
        FRAME
      </p>
    </footer>
  );
}
