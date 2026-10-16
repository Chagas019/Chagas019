import Reveal from './Reveal';

const STEPS = [
  { n: '01', name: 'Lectio', pt: 'Ler', text: 'Ler o Evangelho do dia com calma, palavra por palavra, como quem recebe uma carta.' },
  { n: '02', name: 'Meditatio', pt: 'Meditar', text: 'Ruminar o que tocou o coração e perguntar: o que este texto diz para mim hoje?' },
  { n: '03', name: 'Oratio', pt: 'Orar', text: 'Responder a Deus com sinceridade: louvor, pedido de perdão, súplica, entrega.' },
  { n: '04', name: 'Contemplatio', pt: 'Contemplar', text: 'Descansar em silêncio na presença de Deus, sem pressa e sem palavras.' },
];

export default function StepsSection() {
  return (
    <section id="passos" className="scroll-mt-4 bg-black px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
        <span className="text-white/50 text-xs tracking-[0.3em] uppercase">Antes de pregar, rezar</span>
        <h2 className="mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
          Os quatro passos.
        </h2>
        <p className="mt-6 max-w-xl text-white/60 text-sm sm:text-base leading-relaxed">
          A homilia nasce da oração. Antes de seguir o roteiro, faça a Lectio Divina com o Evangelho do dia: a leitura
          orante da Bíblia, praticada pela Igreja desde os primeiros monges. Quem prega primeiro se deixa tocar pela Palavra.
        </p>
        </Reveal>
        <div className="mt-12 grid gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={(i + 1) as 1 | 2 | 3 | 4} className="bg-black p-6 sm:p-8">
              <div className="font-podium text-white/30 text-4xl">{s.n}</div>
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
