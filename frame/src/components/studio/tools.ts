import { IconLayers, IconMask, IconNodes, IconSparks, IconStudio, IconVault } from "./icons";

/** Os seis atalhos do Creative Studio. Todos levam a telas reais. */
export const STUDIO_TOOLS = [
  { key: "inspiracao", label: "Inspiração", desc: "O feed com trabalhos da comunidade", href: "/", Icon: IconLayers },
  { key: "descobrir", label: "Descobrir", desc: "Busque pessoas, projetos e #hashtags", href: "/descobrir", Icon: IconNodes },
  { key: "desafios", label: "Desafios", desc: "Desafio do dia e Creative Battles", href: "/desafios", Icon: IconMask },
  { key: "recursos", label: "Recursos", desc: "Laboratório Criativo: técnicas abertas e gratuitas", href: "/laboratorio", Icon: IconVault },
  { key: "efeitos", label: "Efeitos", desc: "Cor, transições e antes/depois", href: "/laboratorio?area=edicao", Icon: IconSparks },
  { key: "estudio", label: "Meu estúdio", desc: "Projetos, ideias, rascunhos e tarefas", href: "/estudio", Icon: IconStudio },
] as const;
