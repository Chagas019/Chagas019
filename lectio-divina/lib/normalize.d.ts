export interface Leitura {
  referencia: string;
  titulo: string;
  texto: string;
  refrao?: string;
}

export interface Liturgia {
  data: string;
  liturgia: string;
  cor: string;
  primeiraLeitura: Leitura | null;
  salmo: Leitura | null;
  segundaLeitura: Leitura | null;
  evangelho: Leitura;
  /** Fonte usada pela função /api: 'liturgia-diaria' ou 'cnbb'. */
  fonte?: string;
}

export function normalizeLiturgia(raw: unknown, dataPedida?: string): Liturgia;
