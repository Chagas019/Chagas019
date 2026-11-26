import type { Metadata } from "next";
import Link from "next/link";
import { liturgicalDay, todayInBrazil, upcoming, SEASON_THEMES, COLOR_HEX } from "@/lib/liturgy";
import { LiturgyCard } from "@/components/liturgy-card";
import { ThemeArt } from "@/components/theme-art";
import { PageHeader, ExtLink, Notice } from "@/components/ui/primitives";
import { THEME_BY_ID, THEMES } from "@/data/themes";
import { SOURCES, SONGS } from "@/data/catalog";
import { FORMATION_PORTALS } from "@/data/preachers";
import { MonthCalendar } from "./month-calendar";

export const metadata: Metadata = { title: "Explorar" };
export const revalidate = 3600;

// Temas de pregação mais pedidos em grupos de oração e encontros (seleção editorial).
const FREQUENT = ["cura-e-libertacao", "espirito-santo", "perdao", "misericordia", "familia", "fe-e-esperanca", "conversao", "maria"];

export default function Explorar() {
  const todayIso = todayInBrazil();
  const today = liturgicalDay(todayIso);
  const next = upcoming(todayIso, 21).filter((d) => d.rank === "S" || d.rank === "F" || d.rank === "D").slice(0, 6);
  const seasonThemes = SEASON_THEMES[today.season];
  const reading = SOURCES.filter((s) => s.themeIds.some((t) => seasonThemes.includes(t))).slice(0, 4);
  const songs = SONGS.filter((s) => s.themes.some((t) => seasonThemes.includes(t))).slice(0, 6);

  return (
    <div className="space-y-12">
      <PageHeader eyebrow="Explorar" title="O que a Igreja celebra e o que pregar agora" description="Calendário litúrgico do Brasil, santos do dia e sugestões de temas, leituras e músicas para o tempo litúrgico." />

      <section className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-5">
          <LiturgyCard day={today} />
          <div className="rounded-2xl border border-ivory-300/70 bg-white p-6 shadow-card">
            <h2 className="font-serif text-xl text-royal-900">Santos e celebrações de hoje</h2>
            {today.celebration || today.memorials.length ? (
              <ul className="mt-3 space-y-2 text-sm">
                {today.celebration && <li className="font-medium text-royal-900">{today.celebration}</li>}
                {today.memorials.map((m) => <li key={m} className="text-ink-soft">{m}</li>)}
              </ul>
            ) : <p className="mt-3 text-sm text-ink-soft">Hoje não há memória de santo no Calendário Romano Geral: é dia de semana do {today.seasonLabel}.</p>}
          </div>
          <div className="rounded-2xl border border-ivory-300/70 bg-white p-6 shadow-card">
            <h2 className="font-serif text-xl text-royal-900">Próximas celebrações</h2>
            <ul className="mt-3 divide-y divide-ivory-200">
              {next.map((d) => (
                <li key={d.date} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/10" style={{ background: COLOR_HEX[d.color] }} />
                  <span className="w-20 shrink-0 text-ink-mute">{new Date(d.date + "T12:00:00Z").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })}</span>
                  <span className="text-royal-900">{d.celebration ?? d.weekLabel}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <MonthCalendar today={todayIso} />
      </section>
      <Notice>Calendário calculado segundo as Normas Universais do Ano Litúrgico e o calendário próprio do Brasil (CNBB). Celebrações próprias de dioceses e congregações não aparecem. Para as leituras, use a liturgia oficial do dia.</Notice>

      <section>
        <h2 className="mb-4 font-serif text-2xl text-royal-900">Temas em destaque — {today.seasonLabel}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {seasonThemes.map((id) => THEME_BY_ID[id]).map((t) => (
            <Link key={t.id} href={`/assistente?tema=${encodeURIComponent(t.label)}`} className="overflow-hidden rounded-2xl border border-ivory-300/70 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
              <ThemeArt theme={t.id} className="h-28 rounded-none" label={t.label} />
              <div className="p-4"><p className="font-serif text-lg text-royal-900">{t.label}</p><p className="text-sm text-ink-soft">{t.short}</p><p className="mt-2 text-xs font-semibold text-royal-700">Preparar pregação →</p></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 font-serif text-2xl text-royal-900">Sugestões de leitura</h2>
          <ul className="space-y-3">
            {reading.map((d) => (
              <li key={d.id} className="rounded-2xl border border-ivory-300/70 bg-white/80 p-4">
                <p className="font-serif text-lg text-royal-900">{d.title}</p>
                <p className="text-sm text-ink-soft">{d.author} · {d.year}</p>
                <ExtLink href={d.url} className="mt-2">Ler no site oficial</ExtLink>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-4 font-serif text-2xl text-royal-900">Sugestões de músicas</h2>
          <ul className="space-y-2">
            {songs.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-ivory-300/70 bg-white/80 px-4 py-3">
                <div><p className="font-medium text-royal-900">{s.title}</p><p className="text-xs text-ink-mute">{s.artist}</p></div>
                <ExtLink href={s.spotifyUrl}>Ouvir</ExtLink>
              </li>
            ))}
          </ul>
          <Link href="/musicas" className="mt-3 inline-block text-sm font-medium text-royal-700 hover:underline">Todas as músicas</Link>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-2xl text-royal-900">Temas frequentes em grupos de oração</h2>
        <div className="flex flex-wrap gap-2">
          {FREQUENT.map((id) => THEME_BY_ID[id]).map((t) => <Link key={t.id} href={`/pesquisa?q=${encodeURIComponent(t.label)}`} className="rounded-full border border-ivory-300 bg-white px-4 py-2 text-sm text-royal-800 hover:border-gold-300">{t.label}</Link>)}
          {THEMES.filter((t) => !FREQUENT.includes(t.id)).slice(0, 6).map((t) => <Link key={t.id} href={`/pesquisa?q=${encodeURIComponent(t.label)}`} className="rounded-full border border-ivory-300 bg-white/50 px-4 py-2 text-sm text-ink-soft hover:border-gold-300">{t.label}</Link>)}
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-serif text-2xl text-royal-900">Conteúdos de formação</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FORMATION_PORTALS.map((f) => <li key={f.url} className="rounded-2xl border border-ivory-300 bg-white/70 p-4"><ExtLink href={f.url} className="text-base">{f.name}</ExtLink><p className="mt-1 text-sm text-ink-soft">{f.description}</p></li>)}
        </ul>
      </section>
    </div>
  );
}
