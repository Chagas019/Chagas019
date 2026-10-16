import { CalendarPlus, Download } from 'lucide-react';
import { useLocalStorage } from '../hooks';
import { downloadIcs, googleCalendarUrl } from '../lib/reminder';
import Reveal from './Reveal';

export default function ReminderSection() {
  const [time, setTime] = useLocalStorage('lectio:horario', '06:30');
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const valid = /^\d{2}:\d{2}$/.test(time);

  return (
    <section id="lembrete" className="sec sec-reminder scroll-mt-4 px-6 sm:px-10 lg:px-16 py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 lg:gap-20 items-end">
        <Reveal>
          <span className="eyebrow">Lembrete</span>
          <h2 className="titulo-brilho mt-5 font-podium uppercase leading-[0.95] tracking-tight text-[clamp(2.2rem,5vw,4rem)]">
            Coloque na sua agenda.
          </h2>
              <div className="ornamento" />
          <p className="mt-6 max-w-md text-white/60 text-sm sm:text-base leading-relaxed">
            Escolha um horário e adicione um compromisso diário no seu calendário. Todo dia ele avisa e traz o link do
            site, que já abre no Evangelho e na homilia do dia.
          </p>
        </Reveal>

        <Reveal delay={1} className="vidro p-6 sm:p-8">
          <label htmlFor="horario" className="text-xs tracking-widest uppercase text-white/60">
            Horário da sua oração
          </label>
          <input
            id="horario"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-3 block w-full bg-white/5 border border-white/15 focus:border-ouro outline-none px-4 py-3 text-2xl font-semibold text-white [color-scheme:dark]"
          />
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={valid ? googleCalendarUrl(time, siteUrl) : undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={!valid}
              className="btn-ouro inline-flex items-center gap-2 px-5 py-3 text-xs font-semibold tracking-widest uppercase"
            >
              <CalendarPlus className="w-4 h-4" /> Google Agenda
            </a>
            <button
              type="button"
              disabled={!valid}
              onClick={() => downloadIcs(time, siteUrl)}
              className="inline-flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-5 py-3 text-xs tracking-widest uppercase transition-all disabled:opacity-40"
            >
              <Download className="w-4 h-4" /> iPhone / Outlook (.ics)
            </button>
          </div>
          <p className="mt-4 text-white/35 text-xs">Repete todo dia, no horário de Brasília.</p>
        </Reveal>
      </div>
    </section>
  );
}
