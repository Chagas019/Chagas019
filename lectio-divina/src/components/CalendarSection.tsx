import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, monthGrid, monthLabel } from '../lib/dates';
import { streak } from '../lib/progress';
import Reveal from './Reveal';

type Props = {
  today: string;
  selected: string;
  done: ReadonlySet<string>;
  onPick: (iso: string) => void;
};

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function CalendarSection({ today, selected, done, onPick }: Props) {
  const [month, setMonth] = useState(today.slice(0, 7));
  // Ao escolher um dia por outro caminho (setas da Lectio), o calendário acompanha o mês.
  useEffect(() => setMonth(selected.slice(0, 7)), [selected]);

  const weeks = monthGrid(month + '-01');
  const doneThisMonth = [...done].filter((d) => d.startsWith(month) && d <= today).length;
  const daysSoFar = month < today.slice(0, 7) ? weeks.flat().filter(Boolean).length : month === today.slice(0, 7) ? Number(today.slice(8)) : 0;

  return (
    <section id="calendario" className="scroll-mt-4 bg-neutral-950 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
        <Reveal>
          <span className="text-white/50 text-xs tracking-[0.3em] uppercase">Calendário</span>
          <h2 className="mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
            Um dia de cada vez.
          </h2>
          <p className="mt-6 max-w-md text-white/60 text-sm sm:text-base leading-relaxed">
            Toque em qualquer dia para abrir o Evangelho e a homilia daquela data. Hoje fica destacado e os dias em
            que você leu a homilia ganham uma marca — assim você sempre sabe onde está.
          </p>
          <div className="mt-10 flex flex-wrap gap-8 sm:gap-12">
            <div>
              <div className="text-3xl sm:text-4xl font-bold tracking-tight">{streak(done, today)}</div>
              <div className="mt-1 text-white/50 text-[10px] sm:text-xs tracking-widest uppercase">Dias seguidos</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold tracking-tight">
                {doneThisMonth}
                {daysSoFar > 0 && <span className="text-white/30 text-xl sm:text-2xl">/{daysSoFar}</span>}
              </div>
              <div className="mt-1 text-white/50 text-[10px] sm:text-xs tracking-widest uppercase">Lidas no mês</div>
            </div>
          </div>
          <ul className="mt-10 space-y-3 text-xs text-white/60">
            <li className="flex items-center gap-3">
              <span className="h-5 w-5 ring-1 ring-white" /> Hoje
            </li>
            <li className="flex items-center gap-3">
              <span className="h-5 w-5 bg-white" /> Dia aberto
            </li>
            <li className="flex items-center gap-3">
              <span className="relative h-5 w-5 bg-white/5">
                <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber-300" />
              </span>
              Homilia lida
            </li>
          </ul>
        </Reveal>

        <Reveal delay={1} className="border border-white/10 p-4 sm:p-8">
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setMonth(addMonths(month + '-01', -1).slice(0, 7))}
              className="border border-white/20 hover:border-white/60 p-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="font-podium uppercase text-xl sm:text-2xl tracking-wide">{monthLabel(month + '-01')}</div>
              {month !== today.slice(0, 7) && (
                <button
                  type="button"
                  onClick={() => setMonth(today.slice(0, 7))}
                  className="mt-1 text-[10px] tracking-widest uppercase text-white/50 hover:text-white"
                >
                  Voltar para hoje
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setMonth(addMonths(month + '-01', 1).slice(0, 7))}
              className="border border-white/20 hover:border-white/60 p-2 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <table className="mt-6 w-full table-fixed border-separate border-spacing-1 sm:border-spacing-2">
            <thead>
              <tr>
                {WEEK.map((d, i) => (
                  <th key={i} className="pb-2 text-[10px] sm:text-xs font-medium tracking-widest text-white/40">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi}>
                  {week.map((iso, di) => {
                    if (!iso) return <td key={di} />;
                    const isToday = iso === today;
                    const isSel = iso === selected;
                    const isDone = done.has(iso);
                    const isSunday = di === 0;
                    return (
                      <td key={di} className="p-0">
                        <button
                          type="button"
                          onClick={() => onPick(iso)}
                          aria-label={`Abrir o Evangelho de ${iso}${isDone ? ', homilia lida' : ''}`}
                          aria-current={isToday ? 'date' : undefined}
                          className={`relative flex aspect-square w-full items-center justify-center text-sm sm:text-base transition-colors ${
                            isSel
                              ? 'bg-white text-black font-semibold'
                              : `bg-white/5 hover:bg-white/15 ${iso > today ? 'text-white/45' : 'text-white/90'}`
                          } ${isToday && !isSel ? 'ring-1 ring-white' : ''} ${isSunday && !isSel ? 'font-semibold' : ''}`}
                        >
                          {Number(iso.slice(8))}
                          {isDone && (
                            <span
                              className={`absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full ${
                                isSel ? 'bg-amber-500' : 'bg-amber-300'
                              }`}
                            />
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </div>
    </section>
  );
}
