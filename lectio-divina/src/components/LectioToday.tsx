import { useEffect, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, ExternalLink, RotateCw, Timer } from 'lucide-react';
import { useLectio, useLocalStorage } from '../hooks';
import { addDays, longDate } from '../lib/dates';
import { liturgicalColor, type Leitura } from '../lib/lectio';

type Props = {
  iso: string;
  today: string;
  onChangeDay: (iso: string) => void;
  isDone: boolean;
  onToggleDone: () => void;
};

const STEPS = [
  {
    key: 'meditatio',
    n: '02',
    title: 'Meditatio · Meditar',
    hint: 'Leia de novo. Qual palavra ou frase tocou seu coração? O que Deus está dizendo a você hoje?',
    placeholder: 'A palavra que ficou em mim foi…',
  },
  {
    key: 'oratio',
    n: '03',
    title: 'Oratio · Orar',
    hint: 'Responda a Deus com suas palavras: agradeça, peça perdão, peça ajuda, entregue.',
    placeholder: 'Senhor…',
  },
] as const;

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="mb-4 last:mb-0">
            {p}
          </p>
        ))}
    </>
  );
}

function OtherReading({ label, l }: { label: string; l: Leitura | null }) {
  if (!l) return null;
  return (
    <details className="group border-t border-white/10 py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-inter text-xs tracking-widest uppercase text-white/70 hover:text-white">
        <span>
          {label} <span className="text-white/40 normal-case tracking-normal">· {l.referencia}</span>
        </span>
        <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
      </summary>
      <div className="mt-4 text-white/70 text-sm leading-relaxed">
        {l.refrao && <p className="mb-4 font-semibold text-white">R. {l.refrao}</p>}
        {l.titulo && <p className="mb-3 italic">{l.titulo}</p>}
        <Paragraphs text={l.texto} />
      </div>
    </details>
  );
}

function SilenceTimer() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (left === null || left <= 0) return;
    const t = window.setTimeout(() => setLeft(left - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  const mm = left === null ? '' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  return (
    <button
      type="button"
      onClick={() => setLeft(left && left > 0 ? null : 180)}
      className="mt-4 inline-flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-5 py-3 text-xs tracking-widest uppercase transition-all"
    >
      <Timer className="w-4 h-4" />
      {left === null ? '3 minutos de silêncio' : left > 0 ? `${mm} · parar` : 'Amém · de novo'}
    </button>
  );
}

export default function LectioToday({ iso, today, onChangeDay, isDone, onToggleDone }: Props) {
  const lectio = useLectio(iso);
  const [notes, setNotes] = useLocalStorage<Record<string, Record<string, string>>>('lectio:notas', {});
  const dayNotes = notes[iso] ?? {};
  const setNote = (k: string, v: string) => setNotes((all) => ({ ...all, [iso]: { ...all[iso], [k]: v } }));
  const isToday = iso === today;

  return (
    <section id="hoje" className="scroll-mt-4 bg-black px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-3xl">
        {/* Cabeçalho do dia */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span className="text-white/50 text-xs tracking-[0.3em] uppercase">
            {isToday ? 'A Lectio de hoje' : 'Lectio do dia'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Dia anterior"
              onClick={() => onChangeDay(addDays(iso, -1))}
              className="border border-white/20 hover:border-white/60 p-2 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => onChangeDay(today)}
                className="border border-white/20 hover:border-white/60 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors"
              >
                Hoje
              </button>
            )}
            <button
              type="button"
              aria-label="Próximo dia"
              onClick={() => onChangeDay(addDays(iso, 1))}
              className="border border-white/20 hover:border-white/60 p-2 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <h2 className="mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2rem,5vw,3.5rem)] first-letter:uppercase">
          {longDate(iso)}
        </h2>

        {lectio.status === 'ok' && (lectio.data.liturgia || lectio.data.cor) && (
          <p className="mt-3 flex items-center gap-2 text-white/60 text-sm">
            {lectio.data.cor && (
              <span
                className="inline-block h-3 w-3 rounded-full ring-1 ring-white/30"
                style={{ background: liturgicalColor(lectio.data.cor) }}
                title={`Cor litúrgica: ${lectio.data.cor}`}
              />
            )}
            <span>
              {lectio.data.liturgia}
              {lectio.data.cor && <span className="text-white/40"> · {lectio.data.cor}</span>}
            </span>
          </p>
        )}

        {lectio.status === 'loading' && (
          <div className="mt-10 space-y-3 animate-pulse" aria-label="Carregando">
            <div className="h-4 w-1/3 bg-white/10" />
            <div className="h-4 w-full bg-white/10" />
            <div className="h-4 w-5/6 bg-white/10" />
            <div className="h-4 w-2/3 bg-white/10" />
          </div>
        )}

        {lectio.status === 'error' && (
          <div className="mt-10 border border-white/15 p-6">
            <p className="text-white/80">Não consegui carregar a liturgia deste dia agora.</p>
            <p className="mt-1 text-white/50 text-sm">Verifique sua internet e tente de novo, ou leia na fonte.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={lectio.retry}
                className="inline-flex items-center gap-2 bg-white text-black px-5 py-3 text-xs tracking-widest uppercase"
              >
                <RotateCw className="w-4 h-4" /> Tentar de novo
              </button>
              <a
                href="https://liturgia.cancaonova.com/pb/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 px-5 py-3 text-xs tracking-widest uppercase"
              >
                Liturgia na Canção Nova <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        )}

        {lectio.status === 'ok' && (
          <div className="animate-fade-in">
            {/* 1. Lectio */}
            <article className="mt-12">
              <div className="flex items-baseline gap-4">
                <span className="font-podium text-white/30 text-3xl">01</span>
                <h3 className="text-xs tracking-[0.3em] uppercase text-white/70">Lectio · Ler</h3>
              </div>
              <p className="mt-3 text-white/50 text-sm">
                Peça a luz do Espírito Santo e leia devagar, mais de uma vez.
              </p>
              <div className="mt-6 border-l-2 border-white/30 pl-5 sm:pl-7">
                <p className="flex items-center gap-2 text-xs tracking-widest uppercase text-white/60">
                  <BookOpen className="w-4 h-4" /> Evangelho · {lectio.data.evangelho.referencia}
                </p>
                {lectio.data.evangelho.titulo && (
                  <p className="mt-3 italic text-white/60">{lectio.data.evangelho.titulo}</p>
                )}
                <div className="mt-4 text-white/90 text-base sm:text-lg leading-relaxed">
                  <Paragraphs text={lectio.data.evangelho.texto} />
                </div>
              </div>
            </article>

            {/* 2 e 3. Meditatio e Oratio */}
            {STEPS.map((s) => (
              <div key={s.key} className="mt-12">
                <div className="flex items-baseline gap-4">
                  <span className="font-podium text-white/30 text-3xl">{s.n}</span>
                  <h3 className="text-xs tracking-[0.3em] uppercase text-white/70">{s.title}</h3>
                </div>
                <p className="mt-3 text-white/60 text-sm sm:text-base leading-relaxed">{s.hint}</p>
                <textarea
                  value={dayNotes[s.key] ?? ''}
                  onChange={(e) => setNote(s.key, e.target.value)}
                  placeholder={s.placeholder}
                  rows={3}
                  className="mt-4 w-full resize-y bg-white/5 border border-white/15 focus:border-white/50 outline-none p-4 text-sm text-white placeholder:text-white/30"
                />
              </div>
            ))}

            {/* 4. Contemplatio */}
            <div className="mt-12">
              <div className="flex items-baseline gap-4">
                <span className="font-podium text-white/30 text-3xl">04</span>
                <h3 className="text-xs tracking-[0.3em] uppercase text-white/70">Contemplatio · Contemplar</h3>
              </div>
              <p className="mt-3 text-white/60 text-sm sm:text-base leading-relaxed">
                Fique em silêncio na presença de Deus. Não precisa dizer nada: só permaneça com Ele.
              </p>
              <SilenceTimer />
            </div>

            {/* 5. Actio */}
            <div className="mt-12">
              <div className="flex items-baseline gap-4">
                <span className="font-podium text-white/30 text-3xl">05</span>
                <h3 className="text-xs tracking-[0.3em] uppercase text-white/70">Actio · Viver</h3>
              </div>
              <p className="mt-3 text-white/60 text-sm sm:text-base leading-relaxed">
                Um propósito simples e concreto para levar esta Palavra ao seu dia.
              </p>
              <input
                value={dayNotes.actio ?? ''}
                onChange={(e) => setNote('actio', e.target.value)}
                placeholder="Hoje eu vou…"
                className="mt-4 w-full bg-white/5 border border-white/15 focus:border-white/50 outline-none p-4 text-sm text-white placeholder:text-white/30"
              />
            </div>

            <button
              type="button"
              onClick={onToggleDone}
              className={`group mt-12 inline-flex items-center gap-2 px-6 sm:px-8 py-4 text-xs tracking-widest uppercase transition-colors ${
                isDone ? 'bg-white text-black' : 'bg-neutral-900 hover:bg-neutral-800 text-white border border-white/20'
              }`}
            >
              <Check className="w-4 h-4" />
              {isDone ? 'Lectio feita · marcada no calendário' : 'Concluí esta Lectio'}
            </button>

            {/* Outras leituras */}
            <div className="mt-14">
              <p className="mb-2 text-xs tracking-[0.3em] uppercase text-white/40">Outras leituras do dia</p>
              <OtherReading label="1ª Leitura" l={lectio.data.primeiraLeitura} />
              <OtherReading label="Salmo" l={lectio.data.salmo} />
              <OtherReading label="2ª Leitura" l={lectio.data.segundaLeitura} />
            </div>

            <p className="mt-8 text-white/35 text-xs leading-relaxed">
              Textos da Liturgia Diária, carregados automaticamente a cada dia pela API pública{' '}
              <a className="underline hover:text-white" href="https://github.com/Dancrf/liturgia-diaria" target="_blank" rel="noreferrer">
                liturgia-diaria
              </a>
              . Confira também na{' '}
              <a className="underline hover:text-white" href="https://liturgia.cancaonova.com/pb/" target="_blank" rel="noreferrer">
                Canção Nova
              </a>
              . Suas anotações ficam só neste aparelho.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
