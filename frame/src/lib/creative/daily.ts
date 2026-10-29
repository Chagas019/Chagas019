/**
 * Desafio do dia: um tema por dia, igual para todos, em rotação.
 * Participar = publicar com a hashtag do dia (em qualquer visibilidade, inclusive "Só eu").
 */

export const DAILY_PROMPTS = [
  { slug: "uma-foto-uma-historia", title: "Uma foto, uma história", hint: "Conte uma história inteira com uma única imagem." },
  { slug: "so-luz-natural", title: "Retrato só com luz natural", hint: "Nada de flash ou LED: janela, sol ou sombra aberta." },
  { slug: "uma-cor-cinco-fotos", title: "Uma cor, cinco fotografias", hint: "Escolha uma cor e encontre cinco cenas com ela." },
  { slug: "historia-em-15s", title: "Conte uma história em 15 segundos", hint: "Começo, meio e fim em um vídeo curto." },
  { slug: "antes-e-depois", title: "Antes e depois da edição", hint: "Mostre a original e a versão final lado a lado." },
  { slug: "recrie-com-sua-identidade", title: "Recrie uma referência com a sua identidade", hint: "Pegue uma referência e refaça do seu jeito — cite a original." },
  { slug: "detalhe-invisivel", title: "O detalhe que ninguém percebe", hint: "Fotografe algo que todos veem, mas ninguém repara." },
  { slug: "poster-duas-cores", title: "Pôster com apenas duas cores", hint: "Duas cores, uma ideia, nenhuma exceção." },
  { slug: "sombra-protagonista", title: "A sombra é a protagonista", hint: "Construa a imagem a partir de uma sombra." },
  { slug: "mesmo-lugar-outra-hora", title: "Mesmo lugar, outra hora", hint: "Fotografe o mesmo ponto em dois horários diferentes." },
  { slug: "tres-planos", title: "Uma cena em três planos", hint: "Geral, médio e detalhe da mesma ação." },
  { slug: "textura", title: "Textura em primeiro plano", hint: "Madeira, tecido, pele, parede: faça a gente sentir o toque." },
  { slug: "reflexo", title: "Reflexos", hint: "Vidro, água ou metal — a imagem dentro da imagem." },
  { slug: "movimento", title: "Movimento congelado ou borrado", hint: "Escolha: congelar o instante ou deixar o tempo escorrer." },
] as const;

export type DailyPrompt = (typeof DAILY_PROMPTS)[number];

/** Dia no fuso de Brasília, para o tema virar à meia-noite para o público principal. */
export function dayIndex(now = new Date()): number {
  const br = new Date(now.getTime() - 3 * 3600_000);
  return Math.floor(Date.UTC(br.getUTCFullYear(), br.getUTCMonth(), br.getUTCDate()) / 86_400_000);
}

export function dailyPrompt(now = new Date()): DailyPrompt & { tag: string } {
  const p = DAILY_PROMPTS[dayIndex(now) % DAILY_PROMPTS.length]!;
  return { ...p, tag: `desafiodiario` };
}

/** Hashtag específica do tema, para agrupar as participações do dia. */
export function dailyTag(p: { slug: string }) {
  return p.slug.replace(/-/g, "");
}
