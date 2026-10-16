import { useEffect, useState } from 'react';

const SECOES = [
  { id: 'topo', nome: 'Início' },
  { id: 'hoje', nome: 'Evangelho' },
  { id: 'versiculo', nome: 'Palavra do dia' },
  { id: 'homilia', nome: 'Homilia' },
  { id: 'pratica', nome: 'Sua Lectio' },
  { id: 'calendario', nome: 'Calendário' },
  { id: 'lembrete', nome: 'Lembrete' },
];

/** Pontinhos na lateral (computador) mostrando em que parte da página a pessoa está. */
export default function SectionDots() {
  const [ativa, setAtiva] = useState('topo');
  useEffect(() => {
    const io = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visivel) setAtiva(visivel.target.id);
      },
      { threshold: [0.25, 0.5, 0.75] },
    );
    const observar = () => SECOES.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    observar();
    // Algumas seções só aparecem depois que a liturgia carrega.
    const t = window.setTimeout(observar, 2500);
    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);

  return (
    <nav aria-label="Seções da página" className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <ul className="flex flex-col items-end gap-3">
        {SECOES.map((s) => {
          const on = s.id === ativa;
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} className="group flex items-center gap-3" aria-current={on ? 'true' : undefined}>
                <span
                  className={`text-[10px] tracking-[0.25em] uppercase transition-all duration-300 ${
                    on ? 'text-ouro opacity-100' : 'text-white/60 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {s.nome}
                </span>
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    on ? 'h-2.5 w-2.5 bg-ouro shadow-[0_0_10px_rgba(212,168,83,0.9)]' : 'h-1.5 w-1.5 bg-white/40 group-hover:bg-white'
                  }`}
                />
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
