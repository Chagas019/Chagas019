import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, BookOpen, ChevronLeft, ChevronRight, Copy, ExternalLink, RotateCw, Square, Volume2 } from 'lucide-react';
import { useLectio } from '../hooks';
import { addDays, longDate, weekday } from '../lib/dates';
import { frasesRanqueadas, gerarHomilia } from '../lib/homily';
import { liturgicalColor, type Leitura } from '../lib/lectio';
import Reveal from './Reveal';
import VersiculoDoDia from './VersiculoDoDia';

type Props = {
  iso: string;
  today: string;
  onChangeDay: (iso: string) => void;
};

/** Mostra os números de versículo grudados no texto ("2Não") como numerozinhos dourados. */
function Versiculos({ text }: { text: string }) {
  const partes = text.split(/(?<=^|[\s“"‘(])(\d+(?:,\s?\d+)?)(?=[A-Za-zÀ-ÿ“"‘])/);
  return (
    <>
      {partes.map((t, i) =>
        i % 2 === 1 ? (
          <sup key={i} className="mr-0.5 font-inter text-[0.6em] font-semibold text-ouro/80">
            {t}
          </sup>
        ) : (
          t
        ),
      )}
    </>
  );
}

function Paragraphs({ text, first = '' }: { text: string; first?: string }) {
  return (
    <>
      {text
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={`mb-4 last:mb-0 ${i === 0 ? first : ''}`}>
            <Versiculos text={p} />
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

export default function LectioToday({ iso, today, onChangeDay }: Props) {
  const lectio = useLectio(iso);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const isToday = iso === today;
  const versiculo = useMemo(() => {
    if (lectio.status !== 'ok') return null;
    const r = frasesRanqueadas(lectio.data.evangelho.texto);
    return r.frases[0] ? { frase: r.frases[0], deJesus: r.deJesus, referencia: lectio.data.evangelho.referencia } : null;
  }, [lectio]);
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
      <section id="hoje" className="sec sec-gospel scroll-mt-4 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <span className="eyebrow">
                {isToday ? 'O Evangelho de hoje' : 'Evangelho do dia'}
              </span>
              <DayNav iso={iso} today={today} onChangeDay={onChangeDay} />
            </div>
            <h2 className="titulo-brilho mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2rem,5vw,3.5rem)]">
              {longDate(iso)}
            </h2>
              <div className="ornamento" />
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
              <Reveal delay={1} className="vidro mt-10 rounded-sm border-l-2 !border-l-ouro p-6 sm:p-10">
                <p className="flex items-center gap-2 text-xs tracking-widest uppercase text-ouro">
                  <BookOpen className="w-4 h-4" /> Evangelho · {lectio.data.evangelho.referencia}
                </p>
                {lectio.data.evangelho.titulo && <p className="mt-3 italic text-white/60">{lectio.data.evangelho.titulo}</p>}
                <div className="mt-5 font-serif text-white/90 text-lg sm:text-xl leading-relaxed">
                  <Paragraphs text={lectio.data.evangelho.texto} first="capitular" />
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
      {versiculo && <VersiculoDoDia {...versiculo} />}

      {homilia && lectio.status === 'ok' && (
        <section id="homilia" className="sec sec-homily scroll-mt-4 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <span className="eyebrow">
                Homilia · {lectio.data.evangelho.referencia}
              </span>
              <h2 className="titulo-brilho mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
                {isToday ? 'A homilia de hoje.' : 'A homilia do dia.'}
              </h2>
              <div className="ornamento" />
            </Reveal>

            <Reveal delay={1} className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={copy}
                className="btn-ouro inline-flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-xs font-semibold tracking-widest uppercase"
              >
                <Copy className="w-4 h-4" />
                {copied ? 'Homilia copiada' : 'Copiar homilia'}
              </button>
              {canSpeak && (
                <button
                  type="button"
                  onClick={speak}
                  className="inline-flex items-center gap-2 border border-ouro/40 hover:border-ouro hover:bg-ouro/10 px-5 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-xs tracking-widest uppercase transition-all"
                >
                  {speaking ? <Square className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {speaking ? 'Parar' : 'Ouvir'}
                </button>
              )}
            </Reveal>

            <Reveal delay={2}>
              <article className="vidro mt-10 p-6 sm:p-10 text-white/85 text-base sm:text-lg leading-relaxed">
                {homilia.paragrafos.map((par, i) => (
                  <p key={i} className={`mb-6 last:mb-0 ${i === 0 ? 'capitular' : ''}`}>
                    {par}
                  </p>
                ))}
              </article>
            </Reveal>

            <Reveal className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-ouro/15 pt-6">
              <p className="max-w-md text-white/40 text-xs leading-relaxed">
                Homilia escrita automaticamente pelo site a partir das leituras do dia. Muda sozinha todo dia.
              </p>
              <a href="#pratica" className="group inline-flex items-center gap-2 text-xs tracking-widest uppercase text-ouro hover:text-ouro-claro">
                Agora, faça a sua Lectio
                <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              </a>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}
