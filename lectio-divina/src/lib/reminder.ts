import { TZ, addDays, todayISO } from './dates';

const TITLE = 'Lectio Divina Diária';

const compact = (iso: string, hhmm: string) => `${iso.replace(/-/g, '')}T${hhmm.replace(':', '')}00`;

/** Fim do evento, virando o dia se passar da meia-noite. */
function end(iso: string, hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const t = total % (24 * 60);
  const time = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  return compact(addDays(iso, Math.floor(total / (24 * 60))), time);
}

const description = (siteUrl: string) =>
  `Hora da Lectio Divina: leia o Evangelho do dia devagar, medite, reze e contemple. ${siteUrl}`;

/** Lembrete diário em .ics (Apple, Outlook e outros), todo dia no horário escolhido. */
export function buildIcs(hhmm: string, siteUrl: string, now: Date = new Date()): string {
  const start = todayISO(now);
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Lectio Divina Diaria//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE',
    `TZID:${TZ}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0300',
    'TZOFFSETTO:-0300',
    'TZNAME:-03',
    'END:STANDARD',
    'END:VTIMEZONE',
    'BEGIN:VEVENT',
    `UID:lectio-diaria-${stamp}@lectio-divina`,
    `DTSTAMP:${stamp}`,
    `DTSTART;TZID=${TZ}:${compact(start, hhmm)}`,
    'DURATION:PT20M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${esc(TITLE)}`,
    `DESCRIPTION:${esc(description(siteUrl))}`,
    `URL:${siteUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0M',
    `DESCRIPTION:${esc(TITLE)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

/** Link do Google Agenda já preenchido, repetindo todo dia. */
export function googleCalendarUrl(hhmm: string, siteUrl: string, now: Date = new Date()): string {
  const start = todayISO(now);
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: TITLE,
    dates: `${compact(start, hhmm)}/${end(start, hhmm, 20)}`,
    ctz: TZ,
    recur: 'RRULE:FREQ=DAILY',
    details: description(siteUrl),
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

export function downloadIcs(hhmm: string, siteUrl: string) {
  const blob = new Blob([buildIcs(hhmm, siteUrl)], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lectio-divina-diaria.ics';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
