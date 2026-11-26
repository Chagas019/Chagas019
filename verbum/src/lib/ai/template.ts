// Alternativa funcional sem IA: um roteiro-base montado só com o catálogo verificado,
// com orientações para o pregador escrever cada parte.
import { retrieveForTheme } from "@/lib/search";
import { SONG_BY_ID, SOURCE_BY_ID } from "@/data/catalog";
import { verifyBible, verifyCatechism } from "./verify";
import { TIPO_LABEL, type Brief, type SermonOutline } from "./schema";

export function buildTemplateOutline(brief: Brief): SermonOutline {
  const ctx = retrieveForTheme(`${brief.tema} ${brief.objetivo}`, brief.passagem);
  const bible = [
    ...(brief.passagem ? [verifyBible(brief.passagem, "Passagem central escolhida por você.")] : []),
    ...ctx.bible.slice(0, 4).map((b) => verifyBible(b.title, b.description)),
  ];
  const minutos = brief.duracao;
  return {
    brief,
    generatedAt: new Date().toISOString(),
    model: "roteiro-base (sem IA)",
    titulo: brief.tema,
    titulos_alternativos: [],
    objetivo_central: brief.objetivo || "Escreva em uma frase o que você deseja que o público viva ou decida ao final.",
    introducao: `Acolhida e oração inicial (≈${Math.max(2, Math.round(minutos * 0.1))} min). Conte uma situação concreta do cotidiano do público (${brief.publico}) que desperte a pergunta central sobre “${brief.tema}”.`,
    fundamentacao_biblica: bible,
    contextualizacao: "Leia a passagem central no seu contexto: quem fala, a quem, em que momento da história da salvação. Consulte as notas da sua Bíblia de estudo.",
    desenvolvimento: [
      { topico: "1. O que a Palavra revela", conteudo: `Apresente o anúncio central da passagem (≈${Math.round(minutos * 0.3)} min).`, referencias: bible.slice(0, 1) },
      { topico: "2. O que a Igreja ensina", conteudo: "Use as referências do Catecismo e dos documentos abaixo para aprofundar, citando-os a partir do texto oficial.", referencias: [] },
      { topico: "3. O que isso muda na minha vida", conteudo: `Testemunho ou exemplo de santo; leve o público a uma resposta concreta (≈${Math.round(minutos * 0.3)} min).`, referencias: [] },
    ],
    catecismo: ctx.catechism.map((c) => verifyCatechism(c.title.replace(/\D+/, ""), c.description)),
    documentos: ctx.documents.slice(0, 4).map((d) => {
      const src = SOURCE_BY_ID[d.id.replace("documento:", "")];
      return { label: `${src.title} — ${src.author} (${src.year})`, note: src.context, status: "verificada" as const, url: src.url };
    }),
    santos: [],
    aplicacoes_praticas: ["Escreva 2 ou 3 atitudes concretas para a semana."],
    perguntas_reflexao: ["O que esta Palavra revela sobre Deus?", "O que ela pede de mim hoje?", "Qual passo concreto darei nesta semana?"],
    conclusao: "Retome a frase do objetivo central e conduza a um momento de oração.",
    musicas: ctx.songs.slice(0, 4).map((s) => {
      const song = SONG_BY_ID[s.id.replace("musica:", "")];
      return { label: `${song.title} — ${song.artist}`, note: song.rationale, status: "verificada" as const, url: song.spotifyUrl };
    }),
    avisos: [
      "Roteiro-base gerado sem IA: a estrutura e as referências vêm do catálogo verificado; o conteúdo é escrito por você.",
      `Tipo de encontro: ${TIPO_LABEL[brief.tipo]}. Lembre-se: a homilia na Santa Missa é reservada ao ministro ordenado (CIC cân. 767 §1).`,
    ],
  };
}
