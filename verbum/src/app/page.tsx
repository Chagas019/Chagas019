import Link from "next/link";
import { ArrowRight, Search, Music2, Mic2, Library, Sparkles, FolderHeart, Compass, ShieldCheck, BookOpenCheck, Scale } from "lucide-react";
import { Logo } from "@/components/brand";
import { ThemeArt } from "@/components/theme-art";
import { liturgicalDay, todayInBrazil, COLOR_HEX } from "@/lib/liturgy";
import { SOURCES, SONGS } from "@/data/catalog";
import { BIBLE_REFERENCES } from "@/data/bible-references";

export const revalidate = 3600;

const MODULES = [
  { href: "/pesquisa", icon: Search, title: "Central de pesquisa", text: "Temas, passagens, músicas, santos e documentos num só lugar, com filtros por categoria." },
  { href: "/assistente", icon: Sparkles, title: "Preparar minha pregação", text: "Do tema ao roteiro completo: fundamentação bíblica, Catecismo, aplicações e músicas." },
  { href: "/musicas", icon: Music2, title: "Buscador de músicas", text: "Canções católicas por tema e momento, com link direto para ouvir." },
  { href: "/pregacoes", icon: Mic2, title: "Biblioteca de pregações", text: "Encontre pregações e palestras por assunto, pregador e duração." },
  { href: "/biblioteca", icon: Library, title: "Biblioteca teológica", text: "Catecismo, Concílio Vaticano II, encíclicas e exortações com links oficiais." },
  { href: "/explorar", icon: Compass, title: "Explorar", text: "Calendário litúrgico, santos do dia e temas para o tempo que a Igreja vive." },
  { href: "/meu-espaco", icon: FolderHeart, title: "Meu Espaço", text: "Pastas, anotações, referências salvas e projetos de encontros e retiros." },
];

const PUBLIC = ["Pregadores", "Missionários", "Coordenadores de grupos de oração", "Servos de comunidades", "Catequistas", "Líderes de movimentos e pastorais", "Seminaristas e formadores"];

export default function Landing() {
  const today = liturgicalDay(todayInBrazil());
  return (
    <div className="paper min-h-screen overflow-x-hidden bg-ivory-50">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/explorar" className="hidden rounded-full px-3 py-2 text-ink-soft hover:text-royal-800 sm:inline">Explorar</Link>
          <Link href="/biblioteca" className="hidden rounded-full px-3 py-2 text-ink-soft hover:text-royal-800 sm:inline">Biblioteca</Link>
          <Link href="/painel" className="rounded-full bg-royal-800 px-4 py-2 font-medium text-ivory-50 hover:bg-royal-700">Entrar na plataforma</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:pt-16">
        <div className="animate-fade-up">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold-300/70 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
            Plataforma para pregadores católicos
          </p>
          <h1 className="font-serif text-5xl leading-[1.05] text-royal-900 sm:text-6xl lg:text-7xl">
            Prepare a mensagem.
            <br />
            <span className="italic text-gold-700">Anuncie a Palavra.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
            O VERBUM reúne Bíblia, Catecismo, documentos da Igreja, músicas e pregações num só ambiente e ajuda você a
            montar a pregação com fontes que podem ser conferidas.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/assistente" className="inline-flex items-center gap-2 rounded-full bg-royal-800 px-6 py-3 font-semibold text-ivory-50 shadow-lift transition hover:bg-royal-700">
              <Sparkles className="h-4 w-4 text-gold-300" /> Preparar minha pregação
            </Link>
            <Link href="/pesquisa" className="inline-flex items-center gap-2 rounded-full border border-ivory-300 bg-white/70 px-6 py-3 font-semibold text-royal-800 hover:border-royal-300">
              Pesquisar um tema <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-ivory-300 pt-6">
            <div><dt className="text-xs uppercase tracking-wider text-ink-mute">Documentos</dt><dd className="font-serif text-3xl text-royal-900">{SOURCES.length}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-ink-mute">Músicas</dt><dd className="font-serif text-3xl text-royal-900">{SONGS.length}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-ink-mute">Perícopes</dt><dd className="font-serif text-3xl text-royal-900">{BIBLE_REFERENCES.length}</dd></div>
          </dl>
        </div>

        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-gold-100 via-transparent to-royal-50" />
          <div className="overflow-hidden rounded-3xl border border-ivory-300 bg-white shadow-lift">
            <ThemeArt theme="palavra-de-deus" className="h-48 rounded-none" label="Vitral com o símbolo da Palavra" />
            <div className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">Hoje na liturgia</p>
              <p className="mt-2 font-serif text-2xl text-royal-900">{today.celebration ?? today.weekLabel}</p>
              {today.celebration && <p className="text-sm text-ink-soft">{today.weekLabel}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-ink-soft">
                <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full border border-black/10" style={{ background: COLOR_HEX[today.color] }} /> Cor {today.color}</span>
                <span>·</span><span>Ano {today.sundayCycle}</span>
                <span>·</span><span>{today.seasonLabel}</span>
              </div>
              <Link href="/explorar" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-royal-700 hover:underline">Ver calendário litúrgico <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-ivory-300/70 bg-white/60">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2 className="font-serif text-3xl text-royal-900 sm:text-4xl">Tudo o que a preparação pede</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">Sete ferramentas que conversam entre si: o que você encontra numa, salva e usa nas outras.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m, i) => (
              <Link key={m.href} href={m.href} className={`group rounded-2xl border border-ivory-300/80 bg-ivory-50 p-6 transition hover:-translate-y-0.5 hover:border-gold-300 hover:shadow-lift ${i === 1 ? "lg:col-span-2 lg:bg-royal-900 lg:text-ivory-50" : ""}`}>
                <m.icon className={`h-6 w-6 ${i === 1 ? "text-gold-300" : "text-gold-500"}`} />
                <h3 className={`mt-4 font-serif text-xl ${i === 1 ? "lg:text-ivory-50" : "text-royal-900"}`}>{m.title}</h3>
                <p className={`mt-2 text-sm leading-relaxed ${i === 1 ? "text-ink-soft lg:text-royal-100" : "text-ink-soft"}`}>{m.text}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          <div>
            <h2 className="font-serif text-3xl text-royal-900">Compromissos com a verdade</h2>
            <p className="mt-3 text-ink-soft">Uma ferramenta de pregação precisa ser confiável antes de ser inteligente.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3 lg:col-span-2">
            {[
              { icon: ShieldCheck, t: "Fontes verificáveis", d: "Cada documento tem link para o texto oficial. Referências que não conseguimos conferir aparecem sinalizadas." },
              { icon: BookOpenCheck, t: "IA a serviço, não como autoridade", d: "O assistente propõe; você reza, revisa e discerne. Explicações da IA são separadas das fontes." },
              { icon: Scale, t: "Respeito à liturgia", d: "Pregação, formação e testemunho não são homilia: na Santa Missa, a homilia cabe ao ministro ordenado (CIC cân. 767)." },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border border-ivory-300 bg-white/70 p-6">
                <x.icon className="h-6 w-6 text-royal-700" />
                <h3 className="mt-3 font-semibold text-royal-900">{x.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-royal-900 text-ivory-50">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">Para quem é</p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {PUBLIC.map((p) => <li key={p} className="rounded-full border border-royal-700 px-4 py-2 text-sm text-royal-100">{p}</li>)}
          </ul>
          <div className="mt-10 flex flex-col items-start justify-between gap-6 border-t border-royal-800 pt-10 sm:flex-row sm:items-center">
            <p className="max-w-xl font-serif text-2xl">“Ide por todo o mundo e pregai o Evangelho a toda criatura.” <span className="block pt-2 font-sans text-sm text-gold-300">Mc 16,15 (Bíblia Ave-Maria)</span></p>
            <Link href="/painel" className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-3 font-semibold text-white hover:bg-gold-700">Começar agora <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-8 text-sm text-ink-mute sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Logo />
        <p>Ferramenta de apoio. Não substitui o discernimento pastoral nem o Magistério da Igreja.</p>
      </footer>
    </div>
  );
}
