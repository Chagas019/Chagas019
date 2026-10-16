import Reveal from './Reveal';

const STEPS = [
  { n: '01', name: 'Lectio', pt: 'Ler', text: 'Ler o Evangelho do dia com calma, palavra por palavra, como quem recebe uma carta.' },
  { n: '02', name: 'Meditatio', pt: 'Meditar', text: 'Ruminar o que tocou o coração e perguntar: o que este texto diz para mim hoje?' },
  { n: '03', name: 'Oratio', pt: 'Orar', text: 'Responder a Deus com sinceridade: louvor, pedido de perdão, súplica, entrega.' },
  { n: '04', name: 'Contemplatio', pt: 'Contemplar', text: 'Descansar em silêncio na presença de Deus, sem pressa e sem palavras.' },
];

export default function StepsSection() {
  return (
    <section id="passos" className="sec sec-steps scroll-mt-4 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
        <span className="eyebrow">Para rezar</span>
        <h2 className="titulo-brilho mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
          Os quatro passos.
        </h2>
              <div className="ornamento" />
        <p className="mt-6 max-w-xl text-white/60 text-sm sm:text-base leading-relaxed">
          Depois de ler a homilia, reze o Evangelho do dia com a Lectio Divina: a leitura orante da Bíblia, praticada
          pela Igreja desde os primeiros monges. Assim a Palavra sai da página e entra na vida.
        </p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={(i + 1) as 1 | 2 | 3 | 4} className="vidro vidro-hover p-6 sm:p-8">
              <div className="font-serif italic text-ouro text-5xl">{s.n}</div>
              <div className="mt-6 font-podium uppercase text-2xl sm:text-3xl">{s.name}</div>
              <div className="mt-1 text-xs tracking-widest uppercase text-white/50">{s.pt}</div>
              <p className="mt-5 text-white/65 text-sm leading-relaxed">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
