import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, Pause, Play, RotateCcw } from 'lucide-react';
import Reveal from './Reveal';

// Orientação para a pessoa fazer a SUA Lectio Divina. O site não medita nem reza por ela:
// só conduz os passos, com tempo sugerido e um timer de silêncio.
const PASSOS = [
  {
    nome: 'Preparação',
    pt: 'Silenciar',
    min: 1,
    texto: 'Escolha um lugar tranquilo e silencie o celular. Respire fundo, faça o sinal da cruz e peça a luz do Espírito Santo.',
    dicas: ['Deixe as preocupações nas mãos de Deus por alguns minutos.', 'Se quiser, acenda uma vela ou olhe para uma imagem sagrada.'],
    oracao: 'Vinde, Espírito Santo, enchei os corações dos vossos fiéis e acendei neles o fogo do vosso amor.',
  },
  {
    nome: 'Lectio',
    pt: 'Ler',
    min: 5,
    texto: 'Leia o Evangelho do dia devagar, se puder em voz baixa. Depois leia uma segunda vez, com ainda mais calma.',
    dicas: ['Repare nas pessoas, nos lugares, nos gestos e nas palavras.', 'Não tenha pressa de entender tudo: só receba o texto.'],
    lerEvangelho: true,
  },
  {
    nome: 'Meditatio',
    pt: 'Meditar',
    min: 5,
    texto: 'Volte à palavra ou frase que mais tocou o seu coração. Repita-a por dentro, devagar, como quem saboreia.',
    dicas: ['O que Deus está me dizendo hoje com esta Palavra?', 'Onde ela encontra a minha vida, as minhas alegrias e as minhas lutas?'],
  },
  {
    nome: 'Oratio',
    pt: 'Orar',
    min: 3,
    texto: 'Agora responda a Deus com as suas próprias palavras, de coração para coração.',
    dicas: ['Agradeça, louve, peça perdão, peça ajuda.', 'Apresente a Ele as pessoas e as situações que vierem à memória.'],
  },
  {
    nome: 'Contemplatio',
    pt: 'Contemplar',
    min: 3,
    texto: 'Fique em silêncio na presença de Deus. Não precisa pensar nem dizer nada: só permaneça com Ele.',
    dicas: ['Se a mente se distrair, volte à palavra que tocou você.', 'Deixe-se olhar por Deus com amor.'],
  },
  {
    nome: 'Actio',
    pt: 'Viver',
    min: 1,
    texto: 'Escolha um gesto simples e concreto para viver hoje o que você rezou.',
    dicas: ['Uma reconciliação, uma visita, uma ajuda, uma paciência a mais.', 'Termine rezando um Pai-Nosso ou um Glória ao Pai.'],
  },
] as const;

function tocarSino() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [528, 792].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18 / (i + 1), ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.5);
      o.connect(g).connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 2.6);
    });
    navigator.vibrate?.(120);
  } catch {
    /* sem áudio: segue em silêncio */
  }
}

function Timer({ minutos, chave }: { minutos: number; chave: string }) {
  const total = minutos * 60;
  const [resta, setResta] = useState(total);
  const [rodando, setRodando] = useState(false);
  const fim = useRef<number | null>(null);

  useEffect(() => {
    setResta(total);
    setRodando(false);
  }, [chave, total]);

  useEffect(() => {
    if (!rodando) return;
    fim.current = Date.now() + resta * 1000;
    const t = window.setInterval(() => {
      const r = Math.max(0, Math.round(((fim.current ?? 0) - Date.now()) / 1000));
      setResta(r);
      if (r === 0) {
        setRodando(false);
        tocarSino();
      }
    }, 250);
    return () => window.clearInterval(t);
  }, [rodando]);

  const R = 52;
  const C = 2 * Math.PI * R;
  const prog = 1 - resta / total;
  const mm = `${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`;

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke="url(#ouroTimer)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - prog)}
            style={{ transition: 'stroke-dashoffset 0.3s linear', filter: 'drop-shadow(0 0 6px rgba(212,168,83,0.6))' }}
          />
          <defs>
            <linearGradient id="ouroTimer" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f1d79a" />
              <stop offset="100%" stopColor="#a77f2e" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-serif text-3xl text-white tabular-nums">{mm}</span>
          <span className="text-[9px] tracking-[0.25em] uppercase text-white/40">{resta === 0 ? 'Amém' : 'minutos'}</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => (resta === 0 ? (setResta(total), setRodando(true)) : setRodando((r) => !r))}
          className="btn-ouro inline-flex min-h-11 items-center gap-2 px-5 py-3 text-[11px] font-semibold tracking-widest uppercase"
        >
          {rodando ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {rodando ? 'Pausar' : resta === total ? 'Começar' : resta === 0 ? 'De novo' : 'Continuar'}
        </button>
        {resta !== total && (
          <button
            type="button"
            onClick={() => {
              setRodando(false);
              setResta(total);
            }}
            className="inline-flex min-h-11 items-center gap-2 px-5 py-2 text-[11px] tracking-widest uppercase text-white/60 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" /> Zerar
          </button>
        )}
      </div>
    </div>
  );
}

type Props = { feito: boolean; onConcluir: () => void };

export default function PraticaLectio({ feito, onConcluir }: Props) {
  const [i, setI] = useState(0);
  const lista = useRef<HTMLOListElement>(null);
  const primeiro = useRef(true);
  // No celular a lista de passos rola de lado: mantém o passo atual à vista.
  useEffect(() => {
    if (primeiro.current) {
      primeiro.current = false;
      return;
    }
    const ol = lista.current;
    const ativo = ol?.querySelector<HTMLElement>('[aria-current="step"]');
    if (ol && ativo && ol.scrollWidth > ol.clientWidth) {
      ol.scrollTo({ left: ativo.offsetLeft - (ol.clientWidth - ativo.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [i]);
  const passo = PASSOS[i];
  const ultimo = i === PASSOS.length - 1;
  const totalMin = PASSOS.reduce((s, p) => s + p.min, 0);

  return (
    <section id="pratica" className="sec sec-steps scroll-mt-4 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <span className="eyebrow">Agora é a sua vez</span>
          <h2 className="titulo-brilho mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
            Faça a sua Lectio.
          </h2>
          <div className="ornamento" />
          <p className="mt-6 max-w-2xl text-white/65 text-sm sm:text-base leading-relaxed">
            A Lectio Divina é a leitura orante da Bíblia. Ninguém pode rezá-la por você: siga os passos no seu ritmo, com o
            Evangelho de hoje. Leva cerca de {totalMin} minutos.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 lg:grid-cols-[280px_1fr] lg:gap-10">
          {/* Lista de passos */}
          <Reveal delay={1} className="min-w-0">
            <ol ref={lista} className="relative flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0" aria-label="Passos da Lectio">
              {PASSOS.map((p, k) => {
                const ativo = k === i;
                const passou = k < i;
                return (
                  <li key={p.nome} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setI(k)}
                      aria-current={ativo ? 'step' : undefined}
                      className={`group flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left transition-all ${
                        ativo ? 'vidro !border-ouro/60' : 'border border-transparent hover:bg-white/5'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-serif text-sm transition-colors ${
                          ativo ? 'btn-ouro' : passou ? 'bg-ouro/20 text-ouro' : 'border border-white/20 text-white/50'
                        }`}
                      >
                        {passou ? <Check className="w-4 h-4" /> : k + 1}
                      </span>
                      <span className="whitespace-nowrap">
                        <span className={`block font-podium uppercase text-base ${ativo ? 'text-white' : 'text-white/70'}`}>{p.nome}</span>
                        <span className="hidden lg:block text-[10px] tracking-widest uppercase text-white/40">
                          {p.pt} · {p.min} min
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </Reveal>

          {/* Passo atual */}
          <Reveal delay={2} className="min-w-0">
            <div key={i} className="vidro passo-entra relative overflow-hidden p-6 sm:p-10">
              <span aria-hidden className="pointer-events-none absolute -right-4 -top-10 font-serif italic text-[10rem] leading-none text-ouro/10">
                {i + 1}
              </span>
              <div className="relative">
                <p className="text-[10px] tracking-[0.3em] uppercase text-ouro">
                  Passo {i + 1} de {PASSOS.length} · {passo.pt} · cerca de {passo.min} min
                </p>
                <h3 className="mt-3 font-serif italic text-4xl sm:text-5xl text-white">{passo.nome}</h3>
                <p className="mt-5 max-w-xl text-white/85 text-base sm:text-lg leading-relaxed">{passo.texto}</p>
                <ul className="mt-5 space-y-2 text-white/60 text-sm leading-relaxed">
                  {passo.dicas.map((d) => (
                    <li key={d} className="flex gap-3">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ouro" />
                      {d}
                    </li>
                  ))}
                </ul>
                {'oracao' in passo && (
                  <blockquote className="mt-6 border-l-2 border-ouro pl-4 font-serif italic text-lg text-white/90">“{passo.oracao}”</blockquote>
                )}
                {'lerEvangelho' in passo && (
                  <a
                    href="#hoje"
                    className="mt-6 inline-flex min-h-11 items-center gap-2 border border-ouro/40 px-5 py-3 text-[11px] tracking-widest uppercase text-ouro hover:bg-ouro/10"
                  >
                    <BookOpen className="w-4 h-4" /> Abrir o Evangelho de hoje
                  </a>
                )}

                <div className="mt-8 border-t border-white/10 pt-8">
                  <Timer minutos={passo.min} chave={passo.nome} />
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => setI(i - 1)}
                    className="inline-flex min-h-11 items-center gap-2 px-4 py-3 text-[11px] tracking-widest uppercase text-white/60 hover:text-white disabled:opacity-30"
                  >
                    <ArrowLeft className="w-4 h-4" /> Anterior
                  </button>
                  {ultimo ? (
                    <button
                      type="button"
                      onClick={onConcluir}
                      className={`inline-flex min-h-11 items-center gap-2 px-6 py-3 text-[11px] font-semibold tracking-widest uppercase ${
                        feito ? 'border border-ouro text-ouro' : 'btn-ouro'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                      {feito ? 'Lectio feita hoje · no calendário' : 'Concluí a minha Lectio'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setI(i + 1)}
                      className="btn-ouro inline-flex min-h-11 items-center gap-2 px-6 py-3 text-[11px] font-semibold tracking-widest uppercase"
                    >
                      Próximo passo <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
