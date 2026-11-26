import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles, ArrowRight } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { LiturgyCard } from "@/components/liturgy-card";
import { ThemeArt } from "@/components/theme-art";
import { liturgicalDay, todayInBrazil, SEASON_THEMES } from "@/lib/liturgy";
import { THEME_BY_ID } from "@/data/themes";
import { DashboardWidgets } from "./widgets";

export const metadata: Metadata = { title: "Início" };
export const revalidate = 3600;

export default function Painel() {
  const today = liturgicalDay(todayInBrazil());
  const themes = SEASON_THEMES[today.season].map((id) => THEME_BY_ID[id]);
  return (
    <div className="space-y-10">
      <section className="animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">Paz e bem</p>
        <h1 className="mt-2 font-serif text-3xl text-royal-900 sm:text-4xl">O que o Senhor colocou no seu coração para anunciar?</h1>
        <div className="mt-6 max-w-3xl"><SearchBox /></div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Link href="/assistente" className="group relative overflow-hidden rounded-2xl bg-royal-900 p-7 text-ivory-50 shadow-lift">
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full border border-gold-500/30" aria-hidden />
          <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full border border-gold-500/40" aria-hidden />
          <Sparkles className="h-7 w-7 text-gold-300" />
          <h2 className="mt-4 font-serif text-2xl sm:text-3xl">Preparar minha pregação</h2>
          <p className="mt-2 max-w-md text-royal-100">Informe tema, público e duração. Receba um roteiro com fundamentação bíblica, Catecismo, aplicações e músicas, com cada fonte verificada.</p>
          <span className="mt-6 inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-white transition group-hover:bg-gold-700">Começar <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <LiturgyCard day={today} compact />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">{today.seasonLabel}</p>
            <h2 className="font-serif text-2xl text-royal-900">Temas para este tempo</h2>
          </div>
          <Link href="/explorar" className="text-sm font-medium text-royal-700 hover:underline">Explorar mais</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {themes.map((t) => (
            <Link key={t.id} href={`/pesquisa?q=${encodeURIComponent(t.label)}`} className="group overflow-hidden rounded-2xl border border-ivory-300/70 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift">
              <ThemeArt theme={t.id} className="h-24 rounded-none" label={t.label} />
              <div className="p-4">
                <p className="font-serif text-lg text-royal-900">{t.label}</p>
                <p className="text-sm text-ink-soft">{t.short}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <DashboardWidgets />
    </div>
  );
}
