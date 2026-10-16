import Reveal from './Reveal';

type Props = { frase: string; deJesus: boolean; referencia: string };

/** Faixa de destaque com a frase do Evangelho do dia, entre a leitura e a homilia. */
export default function VersiculoDoDia({ frase, deJesus, referencia }: Props) {
  return (
    <section id="versiculo" aria-label="Palavra do dia" className="sec sec-verse px-6 sm:px-10 lg:px-16 py-20 sm:py-28">
      {/* Cruz grande ao fundo, bem suave */}
      <svg
        aria-hidden
        viewBox="0 0 120 160"
        className="cruz-fundo pointer-events-none absolute left-1/2 top-1/2 h-[120%] -translate-x-1/2 -translate-y-1/2 text-ouro"
      >
        <path d="M50 0h20v45h50v20H70v95H50V65H0V45h50z" fill="currentColor" />
      </svg>
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <span className="eyebrow justify-center">{deJesus ? 'Palavra de Jesus para hoje' : 'Palavra para hoje'}</span>
        </Reveal>
        <Reveal delay={1}>
          <blockquote className="mt-8 font-serif italic text-[clamp(1.8rem,4.5vw,3.4rem)] leading-[1.15] text-white">
            <span className="text-ouro">“</span>
            {frase}
            <span className="text-ouro">”</span>
          </blockquote>
        </Reveal>
        <Reveal delay={2}>
          <p className="mt-6 text-xs tracking-[0.3em] uppercase text-white/50">{referencia}</p>
          <div className="ornamento mx-auto" style={{ transformOrigin: 'center' }} />
        </Reveal>
      </div>
    </section>
  );
}
