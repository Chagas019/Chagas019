import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BeforeAfter } from "@/components/product/before-after";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/site/reveal";
import { SectionHead } from "@/components/site/section-head";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";
import { PLANS } from "@/lib/payments/plans";
import { repo } from "@/lib/repo";
import { getEntitlements } from "@/lib/services/entitlements";
import { formatBRL } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const r = repo();
  const user = await getCurrentUser();
  const [banners, featured, latest, categories, collections, inspiration, ent] = await Promise.all([
    r.listBanners(),
    r.listProducts({ featured: true, sort: "recent", limit: 6 }),
    r.listProducts({ sort: "recent", limit: 8 }),
    r.listCategories(),
    r.listCollections(),
    r.listInspiration(),
    getEntitlements(user),
  ]);
  const hero = banners[0];
  const spotlight = featured[0];
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      {/* ------------------------------------------------------------ HERO */}
      <section className="relative overflow-hidden grain">
        <div className="container-lab relative grid gap-8 pb-14 pt-8 md:pt-14 lg:grid-cols-12 lg:gap-6 lg:pb-24">
          <div className="relative z-10 lg:col-span-7 lg:pt-6">
            <div className="lab-label flex flex-wrap gap-x-6 gap-y-2 text-smoke">
              <span>Nº 001 — Laboratório de cor</span>
              <span className="hidden sm:inline">Lightroom · Mobile · Desktop</span>
            </div>
            <h1 className="display mt-6 text-[clamp(3.4rem,11.5vw,10.5rem)]">
              Your
              <br />
              creative
              <br />
              <span className="text-signal">space</span>
              <span className="serif-accent block pt-3 text-[0.42em] leading-[1] text-bone/90 md:pt-4">for photo editing.</span>
            </h1>
            <p className="mt-8 max-w-md text-[17px] leading-relaxed text-ash">{hero?.subtitle ?? "Presets de Lightroom criados como peças de estúdio. Baixe grátis, compre avulso ou entre para o Premium Club."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={hero?.link_url ?? "/presets"}>
                  {hero?.link_label ?? "Explorar presets"} <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/presets?acesso=free">Começar pelos gratuitos</Link>
              </Button>
            </div>
          </div>
          <div className="relative lg:col-span-5">
            {spotlight?.before_image && spotlight.after_image ? (
              <figure className="relative">
                <BeforeAfter before={spotlight.before_image} after={spotlight.after_image} alt={spotlight.name} priority className="rounded-[28px]" sizes="(min-width: 1024px) 40vw, 100vw" />
                <figcaption className="mt-3 flex items-center justify-between px-1">
                  <span className="lab-label text-smoke">Arraste para comparar</span>
                  <Link href={`/presets/${spotlight.slug}`} className="link-underline text-sm">
                    {spotlight.name} <ArrowUpRight className="inline size-4 text-signal" />
                  </Link>
                </figcaption>
              </figure>
            ) : hero?.image_url ? (
              <Image src={hero.image_url} alt="" width={1200} height={1500} priority className="rounded-[28px] object-cover" />
            ) : null}
            <div aria-hidden className="absolute -left-6 top-10 hidden h-28 w-28 rounded-full border border-signal/60 lg:block" />
          </div>
        </div>
        {/* marquee de estilos */}
        <div className="border-y hairline bg-graphite/60 py-4" aria-hidden>
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
            {[...categories, ...categories].map((c, i) => (
              <span key={i} className="display flex items-center gap-10 text-3xl text-bone/80 md:text-4xl">
                {c.name}
                <span className="size-2.5 rounded-full bg-signal" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ MANIFESTO */}
      <section className="container-lab py-20 md:py-28">
        <div className="grid gap-12 lg:grid-cols-12">
          <p className="lab-label text-signal lg:col-span-3">O que é o Preset Lab</p>
          <Reveal className="lg:col-span-9">
            <p className="font-serif text-[clamp(1.9rem,4.4vw,3.9rem)] leading-[1.08] tracking-tight">
              Um laboratório de cor para quem fotografa. Cada preset nasce como <em className="text-signal">receita de estúdio</em>, é testado em luz real e chega à sua biblioteca pronto para o Lightroom — no celular ou no computador.
            </p>
            <div className="mt-14 grid gap-px overflow-hidden rounded-[22px] border hairline bg-bone/10 md:grid-cols-3">
              {[
                { n: "01", t: "Free", d: "Presets gratuitos para baixar com uma conta. Sem cartão, sem pegadinha." },
                { n: "02", t: "Premium", d: "Compre avulso, em reais, com PIX ou cartão. Fica na sua biblioteca para sempre." },
                { n: "03", t: "Club", d: "Assinatura com presets exclusivos, coleções especiais e lançamentos antecipados." },
              ].map((x) => (
                <div key={x.n} className="bg-ink p-7">
                  <span className="lab-label text-smoke">{x.n}</span>
                  <h3 className="display mt-6 text-4xl">{x.t}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-ash">{x.d}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------------ DESTAQUES */}
      <section className="container-lab">
        <SectionHead kicker="Seleção do estúdio" title={<>Em <span className="serif-accent text-signal">destaque</span></>} href="/presets" linkLabel="Ver catálogo" />
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-12 md:gap-x-6">
          {featured.slice(0, 5).map((p, i) => {
            const span = ["md:col-span-5 md:row-span-2", "md:col-span-4", "md:col-span-3 md:mt-24", "md:col-span-3", "md:col-span-4 md:-mt-16"][i];
            return (
              <div key={p.id} className={`${i === 0 ? "col-span-2" : "col-span-1"} ${span}`}>
                <ProductCard product={p} index={i} categoryName={catName.get(p.category_id ?? "")} favorite={ent.favoriteIds.has(p.id)} owned={ent.ownedIds.has(p.id)} loggedIn={!!user} layout={i === 0 ? "tall" : "portrait"} priority={i === 0} />
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------ NOVIDADES */}
      <section className="mt-24 border-y hairline bg-graphite py-16 md:mt-32 md:py-20">
        <div className="container-lab">
          <SectionHead kicker={`Últimos ${latest.length} presets publicados`} title="Novidades" href="/presets?ordem=recent" linkLabel="Todos os lançamentos" />
        </div>
        <div className="container-lab mt-10">
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 scrollbar-none md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
            {latest.map((p, i) => (
              <div key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] md:w-auto">
                <ProductCard product={p} index={i} categoryName={catName.get(p.category_id ?? "")} favorite={ent.favoriteIds.has(p.id)} owned={ent.ownedIds.has(p.id)} loggedIn={!!user} layout="square" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ CATEGORIAS */}
      <section className="container-lab py-24 md:py-32">
        <SectionHead kicker="Índice" title={<>Escolha um <span className="serif-accent text-signal">clima</span></>} href="/estilos" linkLabel="Abrir Style Explorer" />
        <ul className="mt-10 border-t hairline">
          {categories.map((c, i) => (
            <li key={c.id} className="group border-b hairline">
              <Link href={`/presets?categoria=${c.slug}`} className="relative flex items-center gap-4 py-5 md:gap-8 md:py-7">
                <span className="lab-label w-10 text-smoke">{String(i + 1).padStart(2, "0")}</span>
                <span className="display flex-1 text-[clamp(2.2rem,6vw,5.5rem)] transition-colors duration-300 group-hover:text-signal">{c.name}</span>
                <span className="hidden max-w-xs text-sm text-ash md:block">{c.description}</span>
                {c.cover_image && (
                  <span className="relative block h-16 w-12 shrink-0 overflow-hidden rounded-lg md:h-24 md:w-20">
                    <Image src={c.cover_image} alt="" fill sizes="80px" className="object-cover transition duration-700 group-hover:scale-110" />
                  </span>
                )}
                <ArrowUpRight className="size-6 shrink-0 text-smoke transition group-hover:rotate-45 group-hover:text-signal" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------------------------------------------------ COLEÇÕES */}
      <section className="container-lab">
        <SectionHead kicker="Curadoria" title="Coleções" href="/colecoes" linkLabel="Ver coleções" />
        <div className="mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
          {collections.map((c, i) => (
            <Link key={c.id} href={`/colecoes/${c.slug}`} className={`group relative block overflow-hidden rounded-[26px] bg-graphite ${i === 0 ? "md:col-span-2 md:aspect-[16/10]" : "md:aspect-auto"} aspect-[4/5]`}>
              {c.cover_image && <Image src={c.cover_image} alt="" fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover transition duration-[1.4s] ease-[var(--ease-lab)] group-hover:scale-105" />}
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
                <div className="flex flex-wrap gap-2">
                  <span className="lab-label rounded-full bg-ink/70 px-2.5 py-1 backdrop-blur">{c.product_ids.length} presets</span>
                  {c.is_premium && <span className="lab-label rounded-full border border-signal px-2.5 py-1 text-signal">Premium Club</span>}
                  {c.price_cents && <span className="lab-label rounded-full bg-signal px-2.5 py-1 text-signal-ink">Pacote {formatBRL(c.price_cents)}</span>}
                </div>
                <h3 className="display mt-4 text-5xl md:text-6xl">{c.title}</h3>
                <p className="mt-2 max-w-md text-sm text-ash">{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ PREMIUM CLUB */}
      <section className="container-lab py-24 md:py-32">
        <div className="relative overflow-hidden rounded-[32px] bg-signal text-signal-ink">
          <div className="grid gap-10 p-7 md:p-12 lg:grid-cols-12 lg:p-16">
            <div className="lg:col-span-7">
              <p className="lab-label">Premium Club</p>
              <h2 className="display mt-5 text-[clamp(3rem,8vw,7rem)]">
                Entre para
                <br />o clube<span className="serif-accent"> do estúdio.</span>
              </h2>
              <ul className="mt-8 grid gap-3 text-[15px] sm:grid-cols-2">
                {["Presets exclusivos do Club", "Coleções especiais", "Pacotes premium inclusos*", "Novidades antes de todo mundo"].map((b) => (
                  <li key={b} className="flex items-center gap-3">
                    <span className="size-2 rounded-full bg-signal-ink" /> {b}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs opacity-70">*Exceto pacotes marcados como “somente compra avulsa”.</p>
            </div>
            <div className="grid content-end gap-3 lg:col-span-5">
              {Object.values(PLANS).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-2xl bg-signal-ink/10 px-6 py-5">
                  <div>
                    <p className="font-medium">{p.name.replace("Premium Club — ", "")}</p>
                    <p className="text-sm opacity-70">{p.note}</p>
                  </div>
                  <p className="display text-4xl">{formatBRL(p.price_cents)}</p>
                </div>
              ))}
              <Button asChild size="lg" variant="ink" className="mt-2">
                <Link href="/premium">
                  Conhecer o Premium Club <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ INSPIRATION */}
      <section className="container-lab">
        <SectionHead kicker="Galeria" title={<>Inspira<span className="serif-accent text-signal">ção</span></>} href="/inspiracao" linkLabel="Abrir galeria" />
        <div className="mt-10 columns-2 gap-4 md:columns-4 md:gap-6 [&>*]:mb-4 md:[&>*]:mb-6">
          {inspiration.slice(0, 8).map((post, i) => (
            <Link key={post.id} href={`/inspiracao#${post.slug}`} className="group relative block break-inside-avoid overflow-hidden rounded-[20px]">
              <Image src={post.image_url} alt={post.title} width={600} height={i % 3 === 0 ? 900 : 750} sizes="(min-width: 768px) 25vw, 50vw" className={`w-full object-cover transition duration-700 group-hover:scale-105 ${i % 3 === 0 ? "aspect-[2/3]" : "aspect-[4/5]"}`} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-ink/80 to-transparent p-4">
                <div>
                  <p className="lab-label text-smoke">{post.style_name}</p>
                  <p className="font-serif text-xl italic">{post.title}</p>
                </div>
                <div className="flex gap-1" aria-hidden>
                  {post.palette.slice(0, 3).map((c) => (
                    <span key={c} className="size-3 rounded-full" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      {!user && (
        <section className="container-lab pt-24 md:pt-32">
          <div className="border-t hairline pt-12">
            <p className="lab-label text-smoke">Conta gratuita</p>
            <h2 className="display mt-4 text-[clamp(3.2rem,12vw,11rem)]">
              Monte o seu <span className="text-signal">lab.</span>
            </h2>
            <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <p className="max-w-lg text-lg text-ash">Crie uma conta para baixar presets gratuitos, salvar favoritos e guardar tudo o que você comprar em uma biblioteca só sua.</p>
              <Button asChild size="lg">
                <Link href="/cadastro">
                  Criar conta grátis <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
