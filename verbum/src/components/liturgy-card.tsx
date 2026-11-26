import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { COLOR_HEX, DAILY_READINGS_URL, type LiturgicalDay } from "@/lib/liturgy";
import { ExtLink } from "./ui/primitives";

export function LiturgyCard({ day, compact = false }: { day: LiturgicalDay; compact?: boolean }) {
  const date = new Date(day.date + "T12:00:00Z").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ivory-300/70 bg-white p-6 shadow-card">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: COLOR_HEX[day.color] }} aria-hidden />
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700"><CalendarDays className="h-4 w-4" /> {date}</p>
      <p className="mt-3 font-serif text-2xl leading-snug text-royal-900">{day.celebration ?? day.weekLabel}</p>
      {day.celebration && <p className="mt-1 text-sm text-ink-soft">{day.weekLabel}</p>}
      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
        <div className="flex items-center gap-2"><dt className="sr-only">Cor litúrgica</dt><span className="h-3 w-3 rounded-full border border-black/10" style={{ background: COLOR_HEX[day.color] }} /><dd className="capitalize">{day.color}</dd></div>
        <div><dt className="inline">Tempo: </dt><dd className="inline">{day.seasonLabel}</dd></div>
        <div><dt className="inline">Ano </dt><dd className="inline">{day.sundayCycle} · {day.weekdayCycle}</dd></div>
      </dl>
      {!compact && day.memorials.length > 0 && <p className="mt-3 text-sm text-ink-soft"><span className="text-ink-mute">Também: </span>{day.memorials.join("; ")}</p>}
      <div className="mt-5 flex flex-wrap gap-4">
        <ExtLink href={DAILY_READINGS_URL}>Leituras do dia (Canção Nova)</ExtLink>
        {compact && <Link href="/explorar" className="text-sm font-medium text-royal-700 hover:underline">Calendário completo</Link>}
      </div>
    </div>
  );
}
