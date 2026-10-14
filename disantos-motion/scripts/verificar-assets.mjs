// Confere quais arquivos reais já estão nas pastas de assets e grava src/config/assets.generated.ts.
// Rode antes de cada render: `npm run assets` (o comando de render já faz isso).
import { existsSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = (p) => existsSync(join(root, "public", p));

const PRODUTOS = {
  macroEstampa: "produtos/01-macro-estampa.png",
  frenteCamiseta: "produtos/02-camiseta-frente.png",
  detalheTecido: "produtos/03-detalhe-tecido.png",
  detalheGola: "produtos/04-detalhe-gola.png",
  composicaoHero: "produtos/05-composicao-hero.png",
  usoReal: "produtos/06-uso-real.jpg",
};

const status = {
  logo: pub("marca/logo.png"),
  narracao: pub("narracao/narracao-final.wav"),
  trilhaLicenciada: pub("audio/trilha-licenciada.mp3"),
  produtos: Object.fromEntries(Object.entries(PRODUTOS).map(([k, f]) => [k, pub(f)])),
};

const file = `// Arquivo gerado por scripts/verificar-assets.mjs. Não edite à mão.
export const ASSET_STATUS = ${JSON.stringify(status, null, 2)} as const;
`;
writeFileSync(join(root, "src", "config", "assets.generated.ts"), file);

console.log("Assets da campanha:");
const row = (nome, ok, obs = "") => console.log(`  ${ok ? "[ok]   " : "[falta]"} ${nome}${obs ? ` — ${obs}` : ""}`);
row("logo oficial (marca/logo.png)", status.logo, status.logo ? "" : "usando tipografia DISANTOS");
row("narração (narracao/narracao-final.wav)", status.narracao, status.narracao ? "" : "sem narração: legendas do roteiro aparecem, sem áudio de voz");
row("trilha licenciada (opcional)", status.trilhaLicenciada, status.trilhaLicenciada ? "" : "usando trilha original gerada");
for (const [k, f] of Object.entries(PRODUTOS)) row(`produto ${f}`, status.produtos[k], status.produtos[k] ? "" : "quadro-reserva na cena");
const faltam = Object.values(status.produtos).filter((v) => !v).length;
if (faltam) console.log(`\n${faltam} foto(s) de produto ainda são quadros-reserva. A renderização final exige as fotos reais.`);
