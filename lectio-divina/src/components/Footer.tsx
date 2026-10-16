import { Instagram } from 'lucide-react';
import { JESUS_CREDITO } from './JesusBackground';

const INSTAGRAM_URL = 'https://www.instagram.com/chagas_catolico';

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/10 px-6 sm:px-10 lg:px-16 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="font-podium uppercase text-xl tracking-wider">Lectio Divina</span>
          <p className="mt-2 text-white/40 text-xs leading-relaxed max-w-sm">
            “Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho.” — Sl 119(118),105
          </p>
          <p className="mt-2 text-white/25 text-[10px] leading-relaxed max-w-sm">Imagem de abertura: {JESUS_CREDITO}.</p>
        </div>
        <div className="sm:text-right">
          <p className="text-white/40 text-[10px] tracking-[0.3em] uppercase">Criador do site</p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="group mt-2 inline-flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-5 py-3 text-xs text-white tracking-widest uppercase transition-all"
          >
            <Instagram className="w-4 h-4" />
            @chagas_catolico
          </a>
        </div>
      </div>
    </footer>
  );
}
