import { addDays } from './dates';

/** Dias seguidos com a Lectio feita, terminando hoje (ou ontem, se hoje ainda falta). */
export function streak(done: ReadonlySet<string>, today: string): number {
  let day = done.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (done.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}
