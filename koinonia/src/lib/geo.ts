import type { Locale } from "@/types/database";

/** ISO 3166-1 alpha-2. Nomes exibidos via Intl.DisplayNames no idioma do usuário. */
export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ " +
  "DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT " +
  "JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI " +
  "NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK " +
  "TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW"
).split(" ");

/** ISO 639-1 dos idiomas mais comuns na Igreja e em missões. */
export const LANGUAGE_CODES = [
  "pt", "es", "en", "fr", "it", "de", "la", "pl", "nl", "ar", "zh", "ja", "ko", "vi", "tl", "hi", "sw", "ru", "uk", "ro",
  "hu", "cs", "el", "he", "id", "ms", "ta", "ml", "am", "yo", "ig", "ha", "qu", "gn", "ht",
] as const;

const countrySet = new Set(COUNTRY_CODES);
const languageSet = new Set<string>(LANGUAGE_CODES);
export const isCountryCode = (v: string) => countrySet.has(v);
export const isLanguageCode = (v: string) => languageSet.has(v);

function displayNames(locale: Locale, type: "region" | "language"): Intl.DisplayNames {
  return new Intl.DisplayNames([locale], { type });
}

export function countryName(code: string | null | undefined, locale: Locale): string {
  if (!code) return "";
  try {
    return displayNames(locale, "region").of(code) ?? code;
  } catch {
    return code;
  }
}

export function languageName(code: string, locale: Locale): string {
  try {
    const name = displayNames(locale, "language").of(code) ?? code;
    return name.charAt(0).toLocaleUpperCase(locale) + name.slice(1);
  } catch {
    return code;
  }
}

export function sortedCountries(locale: Locale): Array<{ code: string; name: string }> {
  const collator = new Intl.Collator(locale);
  return COUNTRY_CODES.map((code) => ({ code, name: countryName(code, locale) })).sort((a, b) => collator.compare(a.name, b.name));
}

export function sortedLanguages(locale: Locale): Array<{ code: string; name: string }> {
  const collator = new Intl.Collator(locale);
  return LANGUAGE_CODES.map((code) => ({ code, name: languageName(code, locale) })).sort((a, b) => collator.compare(a.name, b.name));
}

export function formatDate(value: string | null | undefined, locale: Locale): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}
