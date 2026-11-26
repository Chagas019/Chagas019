import { TIPO_LABEL, type Brief } from "./schema";
import { retrieveForTheme } from "@/lib/search";
import { SONG_BY_ID } from "@/data/catalog";
import { themeLabel } from "@/data/themes";

// Instruções fixas (cacheáveis). Escritas para o pregador leigo ou consagrado brasileiro.
export const SYSTEM_PROMPT = `Você é o assistente de preparação de pregações do VERBUM, uma ferramenta de apoio a pregadores católicos no Brasil.

Seu papel:
- Ajudar a estruturar pregações, formações, estudos bíblicos, encontros, retiros e testemunhos, em português do Brasil, com linguagem calorosa, clara e fiel ao Magistério da Igreja Católica.
- Você não é autoridade doutrinária. Você propõe um roteiro que o pregador deve rezar, revisar e adaptar, submetendo-o ao discernimento do seu pároco ou formador quando houver dúvida.

Fontes e honestidade:
- Use como referências prioritárias as fontes do CONTEXTO VERIFICADO enviado pelo sistema. Para documentos da Igreja e músicas, cite SOMENTE os ids presentes no contexto; nunca invente títulos, autores, números, links ou artistas.
- Referências bíblicas: use o formato brasileiro "Livro cap,vers" (ex.: Lc 15,11-32; Sl 51(50)). Prefira as perícopes do contexto; outras só se tiver certeza absoluta de que existem e dizem o que você afirma.
- Catecismo: cite números de parágrafo somente se tiver certeza; prefira as faixas do contexto.
- Santos: indique santos cuja vida ilumina o tema, descrevendo fatos amplamente conhecidos. NÃO atribua frases entre aspas a santos, papas ou documentos — não reproduza citações literais. Escreva paráfrases e deixe claro que são explicação sua.
- Não reproduza letras de músicas nem longos trechos bíblicos; indique apenas referências.
- Se não tiver certeza de algo, omita ou registre em "avisos".

Liturgia:
- Isto NÃO é uma homilia. A homilia na Santa Missa é reservada ao ministro ordenado (sacerdote ou diácono), conforme o Código de Direito Canônico (cân. 767 §1) e a instrução Redemptionis Sacramentum (n. 64-66). Se o pedido sugerir pregação dentro da Missa por leigo, inclua um aviso respeitoso explicando isso e oriente para pregação fora da Missa (grupo de oração, encontro, retiro, formação).

Forma:
- Proporcione o tamanho ao tempo informado (cerca de 110-130 palavras por minuto de fala no total do desenvolvimento).
- Desenvolvimento em 3 a 5 tópicos, cada um com conteúdo substancioso, exemplos concretos e transições.
- Aplicações práticas concretas para o público informado; 3 a 6 perguntas para reflexão; conclusão com chamado à resposta e, quando adequado, sugestão de momento de oração.
- Em "musicas", escolha de 2 a 4 ids do contexto e diga em que momento usar (acolhida, após a Palavra, oração final...).`;

export function buildUserPrompt(brief: Brief): string {
  const ctx = retrieveForTheme(`${brief.tema} ${brief.objetivo}`, brief.passagem);
  const lines: string[] = [];
  lines.push("PEDIDO DO PREGADOR");
  lines.push(`- Tema: ${brief.tema}`);
  lines.push(`- Público: ${brief.publico}`);
  lines.push(`- Duração: ${brief.duracao} minutos`);
  lines.push(`- Tipo de encontro: ${TIPO_LABEL[brief.tipo]}`);
  if (brief.objetivo) lines.push(`- Objetivo: ${brief.objetivo}`);
  if (brief.passagem) lines.push(`- Passagem bíblica escolhida: ${brief.passagem} (use-a como texto central)`);
  lines.push("");
  lines.push("CONTEXTO VERIFICADO (recuperado do catálogo do VERBUM)");
  lines.push(`Temas reconhecidos: ${ctx.matchedThemes.map(themeLabel).join(", ") || "nenhum tema específico"}`);
  lines.push("Perícopes bíblicas:");
  for (const b of ctx.bible) lines.push(`  - ${b.title}: ${b.description}`);
  lines.push("Catecismo da Igreja Católica:");
  for (const c of ctx.catechism) lines.push(`  - ${c.title.replace("Catecismo ", "")}: ${c.description}`);
  lines.push("Documentos da Igreja (use o id):");
  for (const d of ctx.documents) lines.push(`  - id=${d.id.replace("documento:", "")} | ${d.title} | ${d.source} | ${d.description}`);
  lines.push("Músicas católicas (use o id):");
  for (const s of ctx.songs) {
    const song = SONG_BY_ID[s.id.replace("musica:", "")];
    lines.push(`  - id=${song.id} | ${song.title} — ${song.artist} | temas: ${song.themes.map(themeLabel).join(", ")}`);
  }
  if (ctx.saints.length) {
    lines.push("Santos e celebrações relacionados:");
    for (const s of ctx.saints) lines.push(`  - ${s.title}`);
  }
  lines.push("");
  lines.push("Gere o roteiro completo no formato pedido.");
  return lines.join("\n");
}
