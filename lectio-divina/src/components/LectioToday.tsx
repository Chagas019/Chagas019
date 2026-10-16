import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check, ChevronLeft, ChevronRight, Copy, ExternalLink, RotateCw, Square, Volume2 } from 'lucide-react';
import { useLectio } from '../hooks';
import { addDays, longDate, weekday } from '../lib/dates';
import { gerarHomilia, montarRoteiro } from '../lib/homily';
import { liturgicalColor, type Leitura } from '../lib/lectio';
import Reveal from './Reveal';

type Props = {
  iso: string;
  today: string;
  onChangeDay: (iso: string) => void;
  isDone: boolean;
  onToggleDone: () => void;
};

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
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs tracking-widest uppercase text-white/70 hover:text-white">
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

function DayNav({ iso, today, onChangeDay }: Pick<Props, 'iso' | 'today' | 'onChangeDay'>) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" aria-label="Dia anterior" onClick={() => onChangeDay(addDays(iso, -1))} className="border border-white/20 hover:border-white/60 p-2 transition-colors">
        <ChevronLeft className="w-4 h-4" />
      </button>
      {iso !== today && (
        <button type="button" onClick={() => onChangeDay(today)} className="border border-white/20 hover:border-white/60 px-3 py-2 text-[11px] tracking-widest uppercase transition-colors">
          Hoje
        </button>
      )}
      <button type="button" aria-label="Próximo dia" onClick={() => onChangeDay(addDays(iso, 1))} className="border border-white/20 hover:border-white/60 p-2 transition-colors">
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function LectioToday({ iso, today, onChangeDay, isDone, onToggleDone }: Props) {
  const lectio = useLectio(iso);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const isToday = iso === today;
  const roteiro = useMemo(
    () => (lectio.status === 'ok' ? montarRoteiro(lectio.data, longDate(iso)) : null),
    [lectio, iso],
  );
  const homilia = useMemo(
    () => (lectio.status === 'ok' ? gerarHomilia(lectio.data, iso, weekday(iso)) : null),
    [lectio, iso],
  );
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Para a leitura em voz alta ao trocar de dia ou sair da página.
  useEffect(() => {
    return () => {
      if (canSpeak) window.speechSynthesis.cancel();
      setSpeaking(false);
    };
  }, [iso, canSpeak]);

  const copy = async () => {
    if (!homilia) return;
    try {
      await navigator.clipboard.writeText(homilia.texto);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* sem permissão de área de transferência */
    }
  };

  const speak = () => {
    if (!homilia || !canSpeak) return;
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(homilia.paragrafos.join('\n\n'));
    u.lang = 'pt-BR';
    u.rate = 0.95;
    const voz = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('pt-br'));
    if (voz) u.voice = voz;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    synth.cancel();
    synth.speak(u);
    setSpeaking(true);
  };

  return (
    <>
      {/* Evangelho do dia */}
      <section id="hoje" className="scroll-mt-4 bg-black px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="text-white/50 text-xs tracking-[0.3em] uppercase">
                {isToday ? 'O Evangelho de hoje' : 'Evangelho do dia'}
              </span>
              <DayNav iso={iso} today={today} onChangeDay={onChangeDay} />
            </div>
            <h2 className="mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2rem,5vw,3.5rem)]">
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
          </Reveal>

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
                <button type="button" onClick={lectio.retry} className="inline-flex items-center gap-2 bg-white text-black px-5 py-3 text-xs tracking-widest uppercase">
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
            <>
              <Reveal delay={1} className="mt-10 border-l-2 border-white/30 pl-5 sm:pl-7">
                <p className="flex items-center gap-2 text-xs tracking-widest uppercase text-white/60">
                  <BookOpen className="w-4 h-4" /> Evangelho · {lectio.data.evangelho.referencia}
                </p>
                {lectio.data.evangelho.titulo && <p className="mt-3 italic text-white/60">{lectio.data.evangelho.titulo}</p>}
                <div className="mt-4 text-white/90 text-base sm:text-lg leading-relaxed">
                  <Paragraphs text={lectio.data.evangelho.texto} />
                </div>
              </Reveal>

              <Reveal className="mt-14">
                <p className="mb-2 text-xs tracking-[0.3em] uppercase text-white/40">Outras leituras do dia</p>
                <OtherReading label="1ª Leitura" l={lectio.data.primeiraLeitura} />
                <OtherReading label="Salmo" l={lectio.data.salmo} />
                <OtherReading label="2ª Leitura" l={lectio.data.segundaLeitura} />
              </Reveal>

              <p className="mt-8 text-white/35 text-xs leading-relaxed">
                Textos da Liturgia Diária, carregados automaticamente a cada dia de fonte pública:{' '}
                {lectio.data.fonte === 'cnbb' ? (
                  <a className="underline hover:text-white" href="https://liturgiadiaria.edicoescnbb.com.br/" target="_blank" rel="noreferrer">
                    Edições CNBB
                  </a>
                ) : (
                  <a className="underline hover:text-white" href="https://github.com/Dancrf/liturgia-diaria" target="_blank" rel="noreferrer">
                    API Liturgia Diária
                  </a>
                )}
                .
              </p>
            </>
          )}
        </div>
      </section>

      {/* Homilia do dia, escrita automaticamente */}
      {homilia && roteiro && lectio.status === 'ok' && (
        <section id="homilia" className="scroll-mt-4 bg-neutral-950 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <span className="text-white/50 text-xs tracking-[0.3em] uppercase">
                {isToday ? 'A homilia de hoje' : 'Homilia do dia'} · {lectio.data.evangelho.referencia}
              </span>
              <h2 className="mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
                “{homilia.titulo}”
              </h2>
            </Reveal>

            <Reveal delay={1} className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-2 bg-black hover:bg-neutral-900 border border-white/20 px-5 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-xs tracking-widest uppercase transition-colors"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Homilia copiada' : 'Copiar homilia'}
              </button>
              {canSpeak && (
                <button
                  type="button"
                  onClick={speak}
                  className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-5 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-xs tracking-widest uppercase transition-all"
                >
                  {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {speaking ? 'Parar' : 'Ouvir'}
                </button>
              )}
            </Reveal>

            <Reveal delay={2}>
              <article className="mt-10 text-white/85 text-base sm:text-lg leading-relaxed">
                {homilia.paragrafos.map((par, i) => (
                  <p key={i} className="mb-6 last:mb-0 first-letter:font-podium first-letter:text-white">
                    {par}
                  </p>
                ))}
              </article>
            </Reveal>

            <Reveal className="mt-12">
              <button
                type="button"
                onClick={onToggleDone}
                className={`inline-flex items-center gap-2 px-6 sm:px-8 py-4 text-xs tracking-widest uppercase transition-colors ${
                  isDone ? 'bg-white text-black' : 'border border-white/30 hover:border-white/60 hover:bg-white/10'
                }`}
              >
                <Check className="w-4 h-4" />
                {isDone ? 'Homilia lida · marcada no calendário' : 'Marcar homilia como lida'}
              </button>
              <p className="mt-6 text-white/35 text-xs leading-relaxed">
                Homilia escrita automaticamente pelo site a partir das leituras do dia: as frases entre aspas são do próprio
                Evangelho e do salmo. Muda sozinha todo dia.
              </p>
            </Reveal>

            {/* Para quem vai pregar: o roteiro por trás da homilia */}
            <Reveal className="mt-14">
              <details className="group border-t border-white/10 pt-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-xs tracking-widest uppercase text-white/70 hover:text-white">
                  Vai pregar? Veja o roteiro desta homilia
                  <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                </summary>
                <div className="mt-8">
                  {roteiro.frases.length > 0 && (
                    <>
                      <p className="text-xs tracking-[0.3em] uppercase text-white/50">Frases do Evangelho para destacar</p>
                      <div className="mt-4 grid gap-px bg-white/10">
                        {roteiro.frases.map((f, i) => (
                          <blockquote key={i} className="bg-neutral-950 py-4 text-white/85 leading-relaxed">
                            “{f}”
                          </blockquote>
                        ))}
                      </div>
                    </>
                  )}
                  <ol className="mt-8 space-y-6">
                    {roteiro.passos.map((p, i) => (
                      <li key={p.titulo} className="grid grid-cols-[48px_1fr] gap-4">
                        <span className="font-podium text-white/30 text-3xl">{String(i + 1).padStart(2, '0')}</span>
                        <div>
                          <div className="flex flex-wrap items-baseline gap-x-3">
                            <h3 className="font-podium uppercase text-xl sm:text-2xl">{p.titulo}</h3>
                            <span className="text-[10px] tracking-widest uppercase text-white/40">{p.minutos}</span>
                          </div>
                          <p className="mt-2 text-white/65 text-sm leading-relaxed">{p.texto}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </details>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
