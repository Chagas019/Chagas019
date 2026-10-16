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
}

export function normalizeLiturgia(raw: unknown, dataPedida?: string): Liturgia;
