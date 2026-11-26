// Temas de pregação usados em toda a plataforma (filtros, busca e assistente).
// `keywords` alimenta a busca: sinônimos e expressões comuns entre pregadores.
export type Theme = {
  id: string;
  label: string;
  short: string;
  keywords: string[];
  music: boolean; // aparece nos filtros do buscador de músicas
};

export const THEMES: Theme[] = [
  { id: "adoracao", label: "Adoração", short: "Diante do Santíssimo e da majestade de Deus", keywords: ["adorar", "adoracao", "santissimo", "presenca", "majestade", "prostrar", "hora santa"], music: true },
  { id: "louvor", label: "Louvor", short: "Bendizer a Deus por quem Ele é", keywords: ["louvar", "louvor", "bendizer", "aleluia", "gloria", "alegria", "gratidao", "agradecer"], music: true },
  { id: "cura-e-libertacao", label: "Cura e libertação", short: "Cristo médico das almas e dos corpos", keywords: ["cura", "curar", "libertacao", "libertar", "doenca", "enfermo", "batalha espiritual", "mal", "oracao de cura"], music: true },
  { id: "perdao", label: "Perdão", short: "Perdoar e ser perdoado", keywords: ["perdao", "perdoar", "ofensa", "magoa", "ressentimento", "reconciliacao", "confissao"], music: true },
  { id: "conversao", label: "Conversão", short: "Voltar o coração para Deus", keywords: ["conversao", "converter", "arrependimento", "mudanca de vida", "metanoia", "volta", "pecado"], music: true },
  { id: "espirito-santo", label: "Espírito Santo", short: "O Paráclito, seus dons e carismas", keywords: ["espirito santo", "pentecostes", "efusao", "carismas", "dons", "fogo", "paraclito", "renovacao carismatica", "rcc"], music: true },
  { id: "eucaristia", label: "Eucaristia", short: "Fonte e ápice da vida cristã", keywords: ["eucaristia", "comunhao", "missa", "pao da vida", "corpo de cristo", "santissimo sacramento", "corpus christi"], music: true },
  { id: "maria", label: "Maria", short: "A Mãe de Deus e da Igreja", keywords: ["maria", "nossa senhora", "virgem", "mae de deus", "rosario", "terco", "mae", "aparecida", "imaculada"], music: true },
  { id: "misericordia", label: "Misericórdia", short: "O coração de Deus que se inclina sobre a miséria", keywords: ["misericordia", "compaixao", "filho prodigo", "divina misericordia", "graca", "bondade"], music: true },
  { id: "fe-e-esperanca", label: "Fé e esperança", short: "Confiar em Deus em meio às provas", keywords: ["fe", "esperanca", "confianca", "confiar", "crise", "medo", "ansiedade", "provacao", "milagre"], music: true },
  { id: "santidade", label: "Santidade", short: "O chamado universal à santidade", keywords: ["santidade", "ser santo", "chamado a santidade", "perfeicao", "virtude", "vida nova", "bem-aventurancas"], music: true },
  { id: "quaresma", label: "Quaresma", short: "Jejum, oração e esmola", keywords: ["quaresma", "jejum", "penitencia", "cinzas", "deserto", "paixao", "semana santa", "cruz"], music: true },
  { id: "advento", label: "Advento", short: "Vigilância e espera do Senhor que vem", keywords: ["advento", "espera", "vigilancia", "vinda", "joao batista", "preparar o caminho", "emanuel"], music: true },
  { id: "oracao", label: "Oração", short: "Escola de oração com Jesus", keywords: ["oracao", "rezar", "orar", "intimidade", "pai nosso", "vida de oracao", "silencio"], music: false },
  { id: "familia", label: "Família", short: "Igreja doméstica", keywords: ["familia", "casamento", "matrimonio", "pais", "filhos", "casais", "lar"], music: false },
  { id: "missao", label: "Missão e evangelização", short: "Ide e anunciai", keywords: ["missao", "evangelizar", "evangelizacao", "anuncio", "querigma", "testemunho", "missionario", "discipulo"], music: false },
  { id: "amor-de-deus", label: "Amor de Deus", short: "Deus é amor", keywords: ["amor", "amor de deus", "pai", "paternidade", "caridade", "amado", "identidade"], music: false },
  { id: "sofrimento-e-cruz", label: "Sofrimento e cruz", short: "O sentido cristão da dor", keywords: ["sofrimento", "dor", "cruz", "luto", "provacao", "tribulacao", "deserto"], music: false },
  { id: "palavra-de-deus", label: "Palavra de Deus", short: "A Escritura na vida do discípulo", keywords: ["palavra", "biblia", "escritura", "lectio divina", "evangelho"], music: false },
  { id: "pascoa", label: "Páscoa", short: "Cristo ressuscitou", keywords: ["pascoa", "ressurreicao", "ressuscitou", "vida nova", "tumulo vazio"], music: false },
  { id: "natal", label: "Natal", short: "O Verbo se fez carne", keywords: ["natal", "nascimento", "presepio", "encarnacao", "menino jesus", "belem"], music: false },
];

export const THEME_BY_ID = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<string, Theme>;
export const MUSIC_THEMES = THEMES.filter((t) => t.music);

export function themeLabel(id: string): string {
  return THEME_BY_ID[id]?.label ?? id;
}
