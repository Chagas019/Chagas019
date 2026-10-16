// Normaliza a resposta da API pública de liturgia diária
// (https://github.com/Dancrf/liturgia-diaria) para o formato usado pelo site.
// Aceita o formato v2 (`leituras.{primeiraLeitura,salmo,segundaLeitura,evangelho}` em listas)
// e o formato antigo (objetos soltos na raiz). Nada é inventado: campo ausente vira "".

const texto = (v) => (typeof v === 'string' ? v.trim() : '');

const primeiro = (v) => {
  if (Array.isArray(v)) return v.find((x) => x && typeof x === 'object') ?? null;
  return v && typeof v === 'object' ? v : null;
};

const leitura = (v) => {
  const l = primeiro(v);
  if (!l) return null;
  const out = {
    referencia: texto(l.referencia),
    titulo: texto(l.titulo),
    texto: texto(l.texto),
  };
  if (l.refrao !== undefined) out.refrao = texto(l.refrao).replace(/^R\.\s*/, '');
  return out.referencia || out.texto ? out : null;
};

/** dd/mm/aaaa → aaaa-mm-dd */
const isoDe = (data) => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto(data));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

/**
 * @param {any} raw resposta crua da API
 * @param {string} [dataPedida] aaaa-mm-dd pedida, usada se a API não informar a data
 */
export function normalizeLiturgia(raw, dataPedida = '') {
  if (!raw || typeof raw !== 'object') throw new Error('Resposta vazia da liturgia');
  const l = raw.leituras && typeof raw.leituras === 'object' ? raw.leituras : raw;
  const evangelho = leitura(l.evangelho);
  if (!evangelho) throw new Error('A liturgia deste dia não trouxe o Evangelho');
  return {
    data: isoDe(raw.data) || dataPedida,
    liturgia: texto(raw.liturgia),
    cor: texto(raw.cor),
    primeiraLeitura: leitura(l.primeiraLeitura),
    salmo: leitura(l.salmo),
    segundaLeitura: leitura(l.segundaLeitura),
    evangelho,
  };
}
