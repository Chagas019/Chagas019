/** Etapas de um projeto do estúdio (compartilhado entre servidor e cliente). */
export const PROJECT_STATUS = [
  { v: "ideia", l: "Ideia" },
  { v: "producao", l: "Produção" },
  { v: "edicao", l: "Edição" },
  { v: "pronto", l: "Pronto" },
] as const;
export type ProjectStatus = (typeof PROJECT_STATUS)[number]["v"];
