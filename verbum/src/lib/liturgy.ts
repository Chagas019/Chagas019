// Calendário litúrgico (Rito Romano, calendário próprio do Brasil).
// Cálculo segundo as Normas Universais sobre o Ano Litúrgico e o Calendário (1969):
// tempos, semanas, ciclos A/B/C e I/II, celebrações móveis e precedência básica.
// Particularidades diocesanas e de comunidades religiosas não são consideradas.
import { FIXED_CELEBRATIONS, type Rank } from "@/data/saints";

export type Season = "advento" | "natal" | "comum" | "quaresma" | "triduo" | "pascoa";
export type Color = "roxo" | "branco" | "verde" | "vermelho" | "rosa";

export type LiturgicalDay = {
  date: string; // AAAA-MM-DD
  season: Season;
  seasonLabel: string;
  weekLabel: string;
  celebration: string | null;
  rank: Rank | "D" | null; // D = domingo
  color: Color;
  sundayCycle: "A" | "B" | "C";
  weekdayCycle: "I" | "II";
  memorials: string[]; // memórias facultativas / comemorações do dia
};

const DAY = 86_400_000;
const utc = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d);
const dow = (t: number) => new Date(t).getUTCDay();
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const mmdd = (t: number) => iso(t).slice(5);
const add = (t: number, days: number) => t + days * DAY;

export function easter(y: number): number {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(y, month, day);
}

export function adventStart(y: number): number {
  const xmas = utc(y, 12, 25);
  return add(xmas, -((dow(xmas) || 7) + 21));
}

function epiphanyBrazil(y: number): number {
  // Domingo entre 2 e 8 de janeiro
  const jan2 = utc(y, 1, 2);
  return add(jan2, (7 - dow(jan2)) % 7);
}

function baptismOfTheLord(y: number): number {
  const ep = epiphanyBrazil(y);
  const day = new Date(ep).getUTCDate();
  return day >= 7 ? add(ep, 1) : add(ep, 7);
}

function holyFamily(y: number): number {
  // Domingo dentro da oitava do Natal; se não houver, 30 de dezembro
  for (let d = 26; d <= 31; d++) if (dow(utc(y, 12, d)) === 0) return utc(y, 12, d);
  return utc(y, 12, 30);
}

const nextSundayOnOrAfter = (t: number) => add(t, (7 - dow(t)) % 7);
const ordinal = (n: number) => `${n}º`;
const ordinalF = (n: number) => `${n}ª`;

type Movable = { name: string; rank: Rank; color: Color };

function movableCelebrations(y: number): Map<string, Movable> {
  const e = easter(y);
  const pent = add(e, 49);
  const adv = adventStart(y);
  const m = new Map<string, Movable>();
  const set = (t: number, name: string, rank: Rank, color: Color = "branco") => m.set(iso(t), { name, rank, color });
  set(epiphanyBrazil(y), "Epifania do Senhor", "S");
  set(baptismOfTheLord(y), "Batismo do Senhor", "F");
  set(add(e, -46), "Quarta-feira de Cinzas", "S", "roxo");
  set(add(e, -7), "Domingo de Ramos da Paixão do Senhor", "S", "vermelho");
  set(add(e, -3), "Quinta-feira Santa — Ceia do Senhor", "S", "branco");
  set(add(e, -2), "Sexta-feira Santa — Paixão do Senhor", "S", "vermelho");
  set(add(e, -1), "Sábado Santo — Vigília Pascal", "S", "branco");
  set(e, "Domingo da Páscoa da Ressurreição do Senhor", "S");
  set(add(e, 7), "2º Domingo da Páscoa — Divina Misericórdia", "S");
  set(add(e, 42), "Ascensão do Senhor", "S"); // transferida para o domingo no Brasil
  set(pent, "Domingo de Pentecostes", "S", "vermelho");
  set(add(pent, 1), "Bem-aventurada Virgem Maria, Mãe da Igreja", "M");
  set(add(pent, 4), "Nosso Senhor Jesus Cristo, Sumo e Eterno Sacerdote", "F");
  set(add(pent, 7), "Santíssima Trindade", "S");
  set(add(pent, 11), "Santíssimo Corpo e Sangue de Cristo (Corpus Christi)", "S");
  set(add(pent, 19), "Sagrado Coração de Jesus", "S");
  set(add(pent, 20), "Imaculado Coração da Virgem Maria", "M");
  set(add(adv, -7), "Nosso Senhor Jesus Cristo, Rei do Universo", "S");
  set(holyFamily(y), "Sagrada Família de Jesus, Maria e José", "F");
  // Brasil: solenidades transferidas para o domingo seguinte quando caem em dia de semana
  const sunday = (md: string) => nextSundayOnOrAfter(utc(y, Number(md.slice(0, 2)), Number(md.slice(3))));
  set(sunday("06-29"), "São Pedro e São Paulo, apóstolos", "S", "vermelho");
  set(sunday("08-15"), "Assunção de Nossa Senhora", "S");
  set(sunday("11-01"), "Todos os Santos", "S");
  // Transferências por impedimento (Semana Santa / Oitava da Páscoa)
  const joseph = utc(y, 3, 19);
  if (joseph >= add(e, -7) && joseph <= add(e, 7)) set(add(e, -8), "São José, esposo da Virgem Maria (transferida)", "S");
  else if (dow(joseph) === 0 && joseph > add(e, -46)) set(add(joseph, 1), "São José, esposo da Virgem Maria (transferida)", "S");
  const annunciation = utc(y, 3, 25);
  if (annunciation >= add(e, -7) && annunciation <= add(e, 7)) set(add(e, 8), "Anunciação do Senhor (transferida)", "S");
  else if (dow(annunciation) === 0 && annunciation > add(e, -46)) set(add(annunciation, 1), "Anunciação do Senhor (transferida)", "S");
  const immaculate = utc(y, 12, 8);
  if (dow(immaculate) === 0) set(add(immaculate, 1), "Imaculada Conceição de Nossa Senhora (transferida)", "S");
  return m;
}

const TRANSFERRED_IN_BRAZIL = new Set(["06-29", "08-15", "11-01"]);
const RED_HINTS = /mártir|apóstol|evangelista|Paixão|Exaltação|Pentecostes|Pedro e São Paulo|Inocentes|Estêvão|Lourenço/i;
const LORD_FEASTS = new Set(["02-02", "08-06", "09-14", "11-09"]);

function seasonInfo(t: number, y: number) {
  const e = easter(y);
  const ash = add(e, -46);
  const pent = add(e, 49);
  const adv = adventStart(y);
  const bapt = baptismOfTheLord(y);
  const baptSunday = epiphanyBrazil(y) + 7 * DAY > bapt ? epiphanyBrazil(y) : add(epiphanyBrazil(y), 7);
  const isSun = dow(t) === 0;
  const weekday = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"][dow(t)];

  if (t >= adv) {
    if (t >= utc(y, 12, 25)) return { season: "natal" as Season, label: "Tempo do Natal", week: isSun ? "Domingo do Tempo do Natal" : `${weekday} do Tempo do Natal` };
    const n = 1 + Math.floor((t - adv) / (7 * DAY));
    return { season: "advento" as Season, label: "Tempo do Advento", week: isSun ? `${ordinal(n)} Domingo do Advento` : `${weekday} da ${ordinalF(n)} Semana do Advento` };
  }
  if (t <= bapt) return { season: "natal" as Season, label: "Tempo do Natal", week: isSun ? "Domingo do Tempo do Natal" : `${weekday} do Tempo do Natal` };
  if (t < ash) {
    const n = Math.floor((t - baptSunday) / (7 * DAY)) + 1;
    return { season: "comum" as Season, label: "Tempo Comum", week: isSun ? `${ordinal(n)} Domingo do Tempo Comum` : `${weekday} da ${ordinalF(n)} Semana do Tempo Comum` };
  }
  if (t < add(e, -3)) {
    if (t < add(ash, 4)) return { season: "quaresma" as Season, label: "Tempo da Quaresma", week: `${weekday} depois das Cinzas` };
    if (t >= add(e, -7)) return { season: "quaresma" as Season, label: "Tempo da Quaresma", week: isSun ? "Domingo de Ramos" : `${weekday} da Semana Santa` };
    const n = 1 + Math.floor((t - add(ash, 4)) / (7 * DAY));
    return { season: "quaresma" as Season, label: "Tempo da Quaresma", week: isSun ? `${ordinal(n)} Domingo da Quaresma` : `${weekday} da ${ordinalF(n)} Semana da Quaresma` };
  }
  if (t < e) return { season: "triduo" as Season, label: "Tríduo Pascal", week: weekday + " Santa" };
  if (t <= pent) {
    const n = 1 + Math.floor((t - e) / (7 * DAY));
    if (t === pent) return { season: "pascoa" as Season, label: "Tempo Pascal", week: "Domingo de Pentecostes" };
    if (n === 1) return { season: "pascoa" as Season, label: "Tempo Pascal", week: isSun ? "Domingo da Páscoa" : `${weekday} da Oitava da Páscoa` };
    return { season: "pascoa" as Season, label: "Tempo Pascal", week: isSun ? `${ordinal(n)} Domingo da Páscoa` : `${weekday} da ${ordinalF(n)} Semana da Páscoa` };
  }
  const n = 35 - Math.ceil((adv - t) / DAY / 7);
  return { season: "comum" as Season, label: "Tempo Comum", week: isSun ? `${ordinal(n)} Domingo do Tempo Comum` : `${weekday} da ${ordinalF(n)} Semana do Tempo Comum` };
}

const SEASON_COLOR: Record<Season, Color> = { advento: "roxo", natal: "branco", comum: "verde", quaresma: "roxo", triduo: "vermelho", pascoa: "branco" };

/** Data de hoje no fuso de Brasília, no formato AAAA-MM-DD. */
export function todayInBrazil(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export function liturgicalDay(dateIso: string): LiturgicalDay {
  const [y, mo, d] = dateIso.split("-").map(Number);
  const t = utc(y, mo, d);
  const info = seasonInfo(t, y);
  const endYear = t >= adventStart(y) ? y + 1 : y;
  const sundayCycle = (["C", "A", "B"] as const)[endYear % 3];
  const weekdayCycle = y % 2 === 1 ? "I" : "II";
  const isSun = dow(t) === 0;
  const movable = movableCelebrations(y).get(iso(t));
  const fixed = FIXED_CELEBRATIONS.filter((c) => c.date === mmdd(t));
  const privileged =
    info.season === "triduo" ||
    (info.season === "pascoa" && t < add(easter(y), 8)) ||
    (isSun && (info.season === "advento" || info.season === "quaresma" || info.season === "pascoa"));
  const lentOrLateAdvent = info.season === "quaresma" || (info.season === "advento" && mo === 12 && d >= 17);

  let celebration: string | null = null;
  let rank: LiturgicalDay["rank"] = isSun ? "D" : null;
  let color: Color = SEASON_COLOR[info.season];
  const memorials: string[] = [];

  if (movable) {
    celebration = movable.name;
    rank = movable.rank;
    color = movable.color;
  }

  for (const f of fixed) {
    if (TRANSFERRED_IN_BRAZIL.has(f.date) && !isSun) continue; // celebrada no domingo seguinte
    if (TRANSFERRED_IN_BRAZIL.has(f.date) && isSun && movable) continue;
    if (movable && (movable.rank === "S" || movable.rank === "F")) {
      if ((f.rank === "m" || f.rank === "M") && !isSun) memorials.push(f.name);
      continue;
    }
    if (f.rank === "S") {
      if (privileged) continue; // transferências específicas tratadas em movableCelebrations
      if (["03-19", "03-25"].includes(f.date) && (isSun || info.season === "triduo")) continue;
      if (f.date === "12-08" && isSun) continue;
      celebration = f.name; rank = "S"; color = RED_HINTS.test(f.name) ? "vermelho" : "branco";
    } else if (f.rank === "F") {
      if (privileged) continue;
      if (isSun && !LORD_FEASTS.has(f.date) && info.season !== "natal") continue;
      celebration = f.name; rank = "F"; color = RED_HINTS.test(f.name) ? "vermelho" : "branco";
    } else if (isSun || info.season === "triduo" || (info.season === "pascoa" && t < add(easter(y), 8))) {
      continue;
    } else if (lentOrLateAdvent) {
      memorials.push(`${f.name} (comemoração)`);
    } else if (f.rank === "M" && !celebration) {
      celebration = f.name; rank = "M"; color = RED_HINTS.test(f.name) ? "vermelho" : "branco";
    } else {
      memorials.push(f.name);
    }
  }

  if (!movable && isSun && info.season === "advento" && info.week.startsWith("3º")) color = "rosa";
  if (!movable && isSun && info.season === "quaresma" && info.week.startsWith("4º")) color = "rosa";

  return {
    date: iso(t),
    season: info.season,
    seasonLabel: info.label,
    weekLabel: info.week,
    celebration,
    rank,
    color,
    sundayCycle,
    weekdayCycle,
    memorials,
  };
}

/** Próximas celebrações relevantes (solenidades, festas e memórias) a partir de uma data. */
export function upcoming(dateIso: string, days = 14): LiturgicalDay[] {
  const [y, m, d] = dateIso.split("-").map(Number);
  const start = utc(y, m, d);
  const out: LiturgicalDay[] = [];
  for (let i = 1; i <= days; i++) {
    const day = liturgicalDay(iso(add(start, i)));
    if (day.celebration || day.rank === "D") out.push(day);
  }
  return out;
}

export const COLOR_HEX: Record<Color, string> = {
  roxo: "#5B3A7A", branco: "#E9E1CF", verde: "#3F6B4A", vermelho: "#9B2C2C", rosa: "#D48AA0",
};

// Fonte oficial para as leituras do dia (a plataforma não reproduz os textos litúrgicos).
export const DAILY_READINGS_URL = "https://liturgia.cancaonova.com/pb/";

/** Temas sugeridos pela curadoria para cada tempo litúrgico. */
export const SEASON_THEMES: Record<Season, string[]> = {
  advento: ["advento", "maria", "fe-e-esperanca", "conversao"],
  natal: ["natal", "maria", "familia", "amor-de-deus"],
  comum: ["palavra-de-deus", "missao", "santidade", "oracao"],
  quaresma: ["quaresma", "conversao", "perdao", "misericordia"],
  triduo: ["sofrimento-e-cruz", "eucaristia", "amor-de-deus"],
  pascoa: ["pascoa", "espirito-santo", "missao", "fe-e-esperanca"],
};
