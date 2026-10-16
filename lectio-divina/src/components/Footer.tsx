import { Instagram } from 'lucide-react';
import { JESUS_CREDITO } from './JesusBackground';

const INSTAGRAM_URL = 'https://www.instagram.com/chagas_catolico';

const LINKS = [
  { label: 'Evangelho', href: '#hoje' },
  { label: 'Homilia', href: '#homilia' },
  { label: 'Sua Lectio', href: '#pratica' },
  { label: 'Calendário', href: '#calendario' },
  { label: 'Lembrete', href: '#lembrete' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-black px-6 sm:px-10 lg:px-16 pt-16 pb-10">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ouro/60 to-transparent" />
      <div aria-hidden className="absolute left-1/2 top-0 h-40 w-[60%] -translate-x-1/2 rounded-full bg-ouro/10 blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow">Lectio Divina Diária</span>
          <p className="mt-6 max-w-2xl font-serif italic text-2xl sm:text-3xl leading-snug text-white/90">
            “Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.”
          </p>
          <p className="mt-3 text-xs tracking-[0.3em] uppercase text-white/40">Sl 119(118),105</p>
          <nav aria-label="Rodapé" className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="text-xs tracking-widest uppercase text-white/60 hover:text-ouro transition-colors">
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col items-center gap-6 border-t border-white/10 pt-8 sm:flex-row sm:justify-between">
          <div className="text-center sm:text-left">
            <span className="font-podium uppercase text-xl tracking-wider">Lectio Divina</span>
            <p className="mt-2 max-w-sm text-white/25 text-[10px] leading-relaxed">Imagem de abertura: {JESUS_CREDITO}.</p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Criador do site</p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="btn-ouro mt-2 inline-flex min-h-11 items-center gap-2 px-5 py-3 text-xs font-semibold tracking-widest uppercase"
            >
              <Instagram className="w-4 h-4" />
              @chagas_catolico
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
