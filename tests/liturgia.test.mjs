// Teste da leitura da página da Canção Nova, com uma página de exemplo no mesmo formato.
// Uso: node tests/liturgia.test.mjs
import { lerLiturgia } from "../api/liturgia.mjs";
const html = `<html><head><meta property="og:title" content="29ª Semana do Tempo Comum | Quinta-feira" />
<meta property="og:url" content="https://liturgia.cancaonova.com/pb/liturgia/exemplo/" /></head><body>
<div class="data-liturgia">
  <div class="dia-liturgia">
    <span id="dia-calendar" class="dia">22</span>
  </div>
  <div class="mes-ano-liturgia">
    <span id="mes-calendar" class="mes">Out</span>
    <span id="ano-calendar" class="ano">2026</span>
  </div>
</div>
<ul id="leituras"><li class="leitura active"><a>1ª Leitura</a><span>Ef 3,14-21</span></li>
<li id="salmo"><a>Salmo</a><span>Sl 32(33),1-2.4-5.11-12.18-19 (R. 5b)</span></li>
<li id="evangelho"><a>Evangelho</a><span>Lc 12,49-53</span></li></ul>
<div id="liturgia-1"><strong>Primeira Leitura (</strong>Ef 3,14-21)<p>Texto da leitura.</p></div>
<div id="liturgia-2"><strong>Respons&oacute;rio </strong>Sl 32(33)<p>- Transborda em toda a terra a bondade do Senhor!</p><p>- Outro verso.</p></div>
<script>var x = "1ª Leitura";</script></body></html>`;
const l = lerLiturgia(html);
const esperado = { data: "2026-10-22", titulo: "29ª Semana do Tempo Comum | Quinta-feira", primeira: "Ef 3,14-21", salmo: "Sl 32(33),1-2.4-5.11-12.18-19 (R. 5b)", refrao: "Transborda em toda a terra a bondade do Senhor!", segunda: "", evangelho: "Lc 12,49-53", fonte: "cancaonova", url: "https://liturgia.cancaonova.com/pb/liturgia/exemplo/" };
let falhas = 0;
for (const [k, v] of Object.entries(esperado)) if (l[k] !== v) { falhas++; console.log(`✗ ${k}: ${JSON.stringify(l[k])} (esperado ${JSON.stringify(v)})`); }
const domingo = lerLiturgia(html.replace('<li id="salmo">', '<li><a>2ª Leitura</a><span>1Jo 2,3-11</span></li><li id="salmo">'));
if (domingo.segunda !== "1Jo 2,3-11") { falhas++; console.log("✗ segunda leitura:", domingo.segunda); }
const vazia = lerLiturgia("<html><body>nada</body></html>");
if (vazia.primeira || vazia.data) { falhas++; console.log("✗ página sem leituras devolveu dados"); }
console.log(falhas ? `${falhas} falha(s)` : "liturgia: tudo certo");
process.exit(falhas ? 1 : 0);
