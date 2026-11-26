"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { liturgicalDay, COLOR_HEX, type LiturgicalDay } from "@/lib/liturgy";

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

export function MonthCalendar({ today }: { today: string }) {
  const [y0, m0] = today.split("-").map(Number);
  const [ym, setYm] = useState({ y: y0, m: m0 });
  const [sel, setSel] = useState<LiturgicalDay | null>(null);

  const days = useMemo(() => {
    const first = new Date(Date.UTC(ym.y, ym.m - 1, 1));
    const count = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();
    const lead = first.getUTCDay();
    const list: (LiturgicalDay | null)[] = Array(lead).fill(null);
    for (let d = 1; d <= count; d++) list.push(liturgicalDay(`${ym.y}-${String(ym.m).padStart(2, "0")}-${String(d).padStart(2, "0")}`));
    return list;
  }, [ym]);

  const move = (delta: number) => setYm(({ y, m }) => { const t = m + delta; return { y: y + Math.floor((t - 1) / 12), m: ((t - 1 + 120) % 12) + 1 }; });
  const label = new Date(Date.UTC(ym.y, ym.m - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const shown = sel ?? days.find((d) => d?.date === today) ?? null;

  return (
    <div className="rounded-2xl border border-ivory-300/70 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => move(-1)} className="rounded-full p-2 hover:bg-ivory-100" aria-label="Mês anterior"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="font-serif text-xl capitalize text-royal-900" aria-live="polite">{label}</h2>
        <button onClick={() => move(1)} className="rounded-full p-2 hover:bg-ivory-100" aria-label="Próximo mês"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-ink-mute" aria-hidden>{WEEK.map((w, i) => <div key={i} className="py-1">{w}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => d ? (
          <button key={d.date} onClick={() => setSel(d)} aria-label={`${d.date.slice(8)}: ${d.celebration ?? d.weekLabel}`} aria-pressed={shown?.date === d.date}
            className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition ${shown?.date === d.date ? "bg-royal-800 text-ivory-50" : d.date === today ? "bg-gold-100 text-royal-900" : "hover:bg-ivory-100"} ${d.rank === "S" ? "font-bold" : ""}`}>
            {Number(d.date.slice(8))}
            <span className="mt-0.5 h-1.5 w-1.5 rounded-full border border-black/10" style={{ background: COLOR_HEX[d.color] }} />
          </button>
        ) : <div key={`v${i}`} />)}
      </div>
      {shown && (
        <div className="mt-4 rounded-xl bg-ivory-100 p-4 text-sm">
          <p className="font-semibold text-royal-900">{shown.celebration ?? shown.weekLabel}</p>
          {shown.celebration && <p className="text-ink-soft">{shown.weekLabel}</p>}
          <p className="mt-1 text-ink-mute">Cor {shown.color} · Ano {shown.sundayCycle} · {shown.rank === "S" ? "Solenidade" : shown.rank === "F" ? "Festa" : shown.rank === "M" ? "Memória" : shown.rank === "D" ? "Domingo" : "Dia de semana"}</p>
          {shown.memorials.length > 0 && <p className="mt-1 text-ink-soft">{shown.memorials.join("; ")}</p>}
        </div>
      )}
    </div>
  );
}
