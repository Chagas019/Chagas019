/**
 * Mapa de categorias → palavras-chave de descoberta.
 * A Shopee Affiliate API pesquisa por keyword (e opcionalmente productCatId).
 * A rotação percorre categorias e keywords de forma cíclica para garantir variedade
 * (não pesquisa apenas os mais populares: alterna sortType entre relevância, vendas e menor preço).
 */
export const CATEGORIES: Record<string, string[]> = {
  "Eletrônicos": ["fone bluetooth", "caixa de som", "carregador turbo", "smartwatch", "power bank", "cabo usb c"],
  "Informática": ["mouse sem fio", "teclado mecânico", "ssd", "webcam", "suporte notebook", "hub usb"],
  "Casa e Decoração": ["luminária led", "organizador", "cortina blackout", "tapete", "fita led", "prateleira"],
  "Cozinha": ["panela antiaderente", "air fryer", "garrafa térmica", "potes herméticos", "faca chef", "mixer"],
  "Moda Feminina": ["vestido", "bolsa feminina", "sandália", "blusa", "conjunto feminino", "relógio feminino"],
  "Moda Masculina": ["camiseta masculina", "tênis masculino", "carteira", "bermuda", "relógio masculino", "boné"],
  "Beleza": ["skincare", "protetor solar", "secador de cabelo", "maquiagem", "perfume", "chapinha"],
  "Saúde e Bem-estar": ["massageador", "balança digital", "termômetro", "vitamina", "escova elétrica", "umidificador"],
  "Esportes": ["garrafa academia", "tapete yoga", "elástico treino", "luva academia", "bicicleta acessórios", "corda pular"],
  "Bebês e Infantil": ["fralda", "brinquedo educativo", "mamadeira", "lenço umedecido", "babador", "kit higiene bebê"],
  "Pet": ["ração", "arranhador", "cama pet", "coleira", "comedouro", "brinquedo cachorro"],
  "Ferramentas": ["parafusadeira", "jogo de chaves", "trena", "furadeira", "alicate", "kit ferramentas"],
  "Automotivo": ["suporte celular carro", "aspirador carro", "câmera ré", "carregador veicular", "capa banco", "cera automotiva"],
  "Games": ["controle", "headset gamer", "mouse gamer", "cadeira gamer", "mousepad", "teclado gamer"],
  "Papelaria": ["caderno", "caneta", "agenda", "marca texto", "mochila escolar", "estojo"],
};

export const ALL_CATEGORIES = Object.keys(CATEGORIES);

export interface RotationPlan {
  category: string;
  keyword: string;
  sortType: 1 | 2 | 4;
}

/**
 * Plano de rotação determinístico a partir de um cursor (persistido no Redis).
 * Intercala categorias: c0k0, c1k0, c2k0, ..., c0k1, c1k1 ...
 */
export function planRotation(categories: string[], cursor: number, count: number, extraKeywords: Record<string, string[]> = {}): RotationPlan[] {
  const cats = categories.length ? categories : ALL_CATEGORIES;
  const sorts: Array<1 | 2 | 4> = [1, 2, 4];
  const out: RotationPlan[] = [];
  for (let i = 0; i < count; i++) {
    const n = cursor + i;
    const category = cats[n % cats.length];
    const kws = [...(CATEGORIES[category] ?? [category]), ...(extraKeywords[category] ?? [])];
    const keyword = kws[Math.floor(n / cats.length) % kws.length];
    // alterna relevância / mais vendidos / menor preço a cada volta pelas categorias
    const sortType = sorts[Math.floor(n / cats.length) % sorts.length];
    out.push({ category, keyword, sortType });
  }
  return out;
}
