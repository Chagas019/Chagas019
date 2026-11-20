import type { GoogleAuth } from "./oauth.js";

const BASE = "https://www.googleapis.com/calendar/v3";

export interface CalEvent { id: string; summary: string; start: string; end: string; location?: string }

interface RawEvent { id: string; summary?: string; location?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }
const map = (e: RawEvent): CalEvent => ({
  id: e.id, summary: e.summary ?? "(sem título)", start: e.start?.dateTime ?? e.start?.date ?? "", end: e.end?.dateTime ?? e.end?.date ?? "",
  ...(e.location ? { location: e.location } : {}),
});

export function createCalendar(auth: GoogleAuth) {
  return {
    async list(userId: string, timeMin: string, timeMax: string, max = 20): Promise<CalEvent[]> {
      const u = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: String(Math.min(Math.max(max, 1), 50)) });
      const r = await auth.api<{ items?: RawEvent[] }>(userId, `${BASE}/calendars/primary/events?${u}`);
      return (r.items ?? []).map(map);
    },
    async create(userId: string, e: { summary: string; start: string; end: string; description?: string; location?: string; attendees?: string[]; timeZone?: string }): Promise<CalEvent> {
      const tz = e.timeZone ? { timeZone: e.timeZone } : {};
      const r = await auth.api<RawEvent>(userId, `${BASE}/calendars/primary/events`, {
        method: "POST",
        body: {
          summary: e.summary, start: { dateTime: e.start, ...tz }, end: { dateTime: e.end, ...tz },
          ...(e.description ? { description: e.description } : {}), ...(e.location ? { location: e.location } : {}),
          ...(e.attendees?.length ? { attendees: e.attendees.map((email) => ({ email })) } : {}),
        },
      });
      return map(r);
    },
    /** Janelas ocupadas no calendário primary. */
    async freeBusy(userId: string, timeMin: string, timeMax: string): Promise<{ start: string; end: string }[]> {
      const r = await auth.api<{ calendars?: { primary?: { busy?: { start: string; end: string }[] } } }>(userId, `${BASE}/freeBusy`, {
        method: "POST", body: { timeMin, timeMax, items: [{ id: "primary" }] },
      });
      return r.calendars?.primary?.busy ?? [];
    },
  };
}
export type Calendar = ReturnType<typeof createCalendar>;
