// Pregadores e canais de formação católicos de referência no Brasil.
// Descrições curtas e factuais. Não listamos vídeos individuais sem verificação:
// os vídeos vêm da API do YouTube (quando configurada) ou de busca direta no YouTube.
export type Preacher = {
  id: string;
  name: string;
  description: string;
  officialUrl?: string; // apenas sites conferidos
  themes: string[];
};

export const PREACHERS: Preacher[] = [
  { id: "padre-paulo-ricardo", name: "Padre Paulo Ricardo", description: "Sacerdote da Arquidiocese de Cuiabá, dedicado à formação doutrinária e espiritual.", officialUrl: "https://padrepauloricardo.org", themes: ["palavra-de-deus", "santidade", "oracao", "eucaristia"] },
  { id: "padre-fabio-de-melo", name: "Padre Fábio de Melo", description: "Sacerdote, cantor e escritor; pregações sobre afetividade, esperança e humanidade.", themes: ["fe-e-esperanca", "amor-de-deus", "sofrimento-e-cruz"] },
  { id: "padre-marcelo-rossi", name: "Padre Marcelo Rossi", description: "Sacerdote da Diocese de Santo Amaro (SP), ligado ao Santuário Mãe de Deus.", themes: ["cura-e-libertacao", "fe-e-esperanca", "louvor"] },
  { id: "padre-reginaldo-manzotti", name: "Padre Reginaldo Manzotti", description: "Sacerdote da Arquidiocese de Curitiba, fundador da Associação Evangelizar é Preciso.", themes: ["missao", "fe-e-esperanca", "maria"] },
  { id: "frei-gilson", name: "Frei Gilson", description: "Religioso carmelita, conhecido pela oração do terço e pela música católica.", themes: ["oracao", "maria", "conversao"] },
  { id: "monsenhor-jonas-abib", name: "Monsenhor Jonas Abib", description: "Fundador da Comunidade Canção Nova (falecido em 2022); vasto acervo de pregações.", officialUrl: "https://www.cancaonova.com", themes: ["espirito-santo", "conversao", "santidade"] },
  { id: "padre-leo-scj", name: "Padre Léo, SCJ", description: "Sacerdote dehoniano, fundador da Comunidade Bethânia (falecido em 2007).", themes: ["cura-e-libertacao", "amor-de-deus", "familia"] },
  { id: "padre-antonio-maria", name: "Padre Antônio Maria", description: "Sacerdote e cantor; pregações de devoção mariana e vida cristã.", themes: ["maria", "louvor"] },
  { id: "marcio-mendes", name: "Márcio Mendes", description: "Missionário da Comunidade Canção Nova e pregador.", themes: ["cura-e-libertacao", "perdao", "espirito-santo"] },
  { id: "dunga", name: "Dunga", description: "Missionário da Comunidade Canção Nova, pregador e cantor, ligado ao projeto PHN para jovens.", themes: ["santidade", "missao"] },
  { id: "padre-chrystian-shankar", name: "Padre Chrystian Shankar", description: "Sacerdote mineiro, pregações sobre vida espiritual e relacionamentos.", themes: ["familia", "fe-e-esperanca"] },
  { id: "padre-roger-araujo", name: "Padre Roger Araújo", description: "Sacerdote da Comunidade Canção Nova.", themes: ["oracao", "palavra-de-deus"] },
  { id: "moyses-azevedo", name: "Moysés Azevedo", description: "Fundador da Comunidade Católica Shalom.", themes: ["missao", "espirito-santo", "santidade"] },
  { id: "ironi-spuldaro", name: "Ironi Spuldaro", description: "Missionário leigo e pregador católico.", themes: ["cura-e-libertacao", "conversao"] },
];

export const PREACHER_BY_ID = Object.fromEntries(PREACHERS.map((p) => [p.id, p])) as Record<string, Preacher>;

// Portais de formação com endereço conferido.
export const FORMATION_PORTALS = [
  { name: "Canção Nova — Formação", url: "https://formacao.cancaonova.com", description: "Artigos de formação, espiritualidade e catequese." },
  { name: "Padre Paulo Ricardo", url: "https://padrepauloricardo.org", description: "Cursos, aulas e homilias comentadas." },
  { name: "Liturgia diária — Canção Nova", url: "https://liturgia.cancaonova.com/pb/", description: "Leituras e salmo de cada dia." },
  { name: "Santa Sé — vatican.va", url: "https://www.vatican.va", description: "Documentos oficiais dos papas e da Cúria Romana." },
  { name: "CNBB", url: "https://www.cnbb.org.br", description: "Conferência Nacional dos Bispos do Brasil." },
];
