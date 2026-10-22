// Liturgia do dia, lida da Canção Nova (https://liturgia.cancaonova.com/pb/).
// Devolve só as referências das leituras e o refrão do salmo, mais o link do dia:
// os textos completos têm direitos autorais e ficam no site da fonte.
const FONTE = "https://liturgia.cancaonova.com/pb/";
const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const ENTIDADES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", hellip: "…", laquo: "«", raquo: "»", ordf: "ª", ordm: "º", ccedil: "ç", Ccedil: "Ç" };
const decodificar = t => t
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&([aeiouAEIOU])(acute|grave|circ|tilde|uml);/g, (_, l, a) => (l + { acute: "́", grave: "̀", circ: "̂", tilde: "̃", uml: "̈" }[a]).normalize("NFC"))
  .replace(/&([a-zA-Z]+);/g, (m, n) => ENTIDADES[n] ?? m);
const meta = (html, prop) => { const m = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]*)"`, "i")); return m ? decodificar(m[1]).trim() : ""; };

export function lerLiturgia(html) {
  const corpo = html.slice(Math.max(0, html.indexOf("<body")));
  const linhas = decodificar(corpo.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n"))
    .split("\n").map(l => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  // data: blocos "dia-liturgia" (22) e "mes-ano-liturgia" (Out 2026), com ou sem <span> dentro
  const bloco = classe => decodificar(((corpo.match(new RegExp(`class="${classe}"[^>]*>([\\s\\S]{0,300}?)</div>`)) || [])[1] || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const dia = (bloco("dia-liturgia").match(/^(\d{1,2})\b/) || [])[1];
  const mesAno = bloco("mes-ano-liturgia");
  const [, mesTxt, ano] = mesAno.match(/([A-Za-zç]{3})\w*\s+(\d{4})/) || [];
  const mes = mesTxt && MESES[mesTxt.slice(0, 3).toLowerCase()];
  const data = dia && mes && ano ? `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}` : "";
  // referências: a lista de abas no topo ("1ª Leitura", "Ef 3,14-21", "Salmo", ...)
  const i = linhas.findIndex(l => /^1ª Leitura$/i.test(l));
  const ref = rotulo => { if (i < 0) return ""; const j = linhas.slice(i, i + 12).findIndex(l => rotulo.test(l)); return j < 0 ? "" : linhas[i + j + 1] || ""; };
  const primeira = ref(/^1ª Leitura$/i), segunda = ref(/^2ª Leitura$/i), salmo = ref(/^Salmo$/i), evangelho = ref(/^Evangelho$/i);
  // refrão: a primeira linha com travessão depois de "Responsório"
  const k = linhas.findIndex(l => /^Respons[óo]rio/i.test(l));
  const linhaRefrao = k < 0 ? "" : linhas.slice(k + 1, k + 6).find(l => /^[-–—]\s*\S/.test(l)) || "";
  const refrao = linhaRefrao.replace(/^[-–—]\s*/, "").slice(0, 220);
  const ok = s => /^[1-3]?\s?[A-Z][a-zçãéíóú]{0,3}\s?\d/.test(s) ? s : ""; // tem cara de referência bíblica (Ef 3,14 / 1Jo 2,3 / Sl 32)
  return { data, titulo: meta(html, "og:title"), primeira: ok(primeira), salmo: ok(salmo), refrao, segunda: ok(segunda), evangelho: ok(evangelho), fonte: "cancaonova", url: meta(html, "og:url") || FONTE };
}

export default async function handler(req, res) {
  res.setHeader("access-control-allow-origin", "*");
  try {
    const r = await fetch(FONTE, { headers: { "user-agent": "Mozilla/5.0 (Comunica+Fe; liturgia do dia)" } });
    if (!r.ok) throw new Error("fonte respondeu " + r.status);
    const lit = lerLiturgia(await r.text());
    if (!lit.data || !(lit.primeira || lit.evangelho)) throw new Error("não encontrei as leituras na página");
    res.setHeader("cache-control", "public, s-maxage=1800, stale-while-revalidate=3600");
    res.status(200).json(lit);
  } catch (e) {
    res.setHeader("cache-control", "no-store");
    res.status(502).json({ erro: String(e.message || e) });
  }
}
