/** Cabeçalho editorial padrão das páginas internas. */
export function PageHero({ kicker, title, children, aside }: { kicker: string; title: React.ReactNode; children?: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="container-lab pb-10 pt-10 md:pb-14 md:pt-16">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-8">
          <p className="lab-label text-signal">{kicker}</p>
          <h1 className="display mt-4 text-[clamp(3rem,10vw,8.5rem)]">{title}</h1>
        </div>
        {(children || aside) && <div className="text-[17px] leading-relaxed text-ash lg:col-span-4">{children}{aside}</div>}
      </div>
    </section>
  );
}
