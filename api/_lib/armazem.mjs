// Armazém de dados da Comunica+Fé: arquivos JSON num Blob privado do Vercel.
// Cada arquivo guarda um objeto inteiro (as contas, ou uma coleção como a agenda).
// Para duas pessoas não apagarem a mudança uma da outra, toda gravação confere a etag
// do arquivo lido antes (ifMatch) e tenta de novo se alguém gravou no meio do caminho.
// Nos testes, ARMAZEM=memoria guarda tudo na memória do processo.
import { put, get } from "./blob.mjs";

const memoria = new Map();
let contador = 0;
const naMemoria = () => process.env.ARMAZEM === "memoria";
export const configurado = () => naMemoria() || !!process.env.BLOB_READ_WRITE_TOKEN;
export function limparMemoria() { memoria.clear(); cache.clear(); }

class Conflito extends Error {}
const ehConflito = e => e instanceof Conflito || (e && (e.name === "BlobPreconditionFailedError" || /precondition|already exists/i.test(e.message || "")));

// cache curto por instância da função: várias pessoas abrindo o site ao mesmo tempo leem o arquivo uma vez só
const cache = new Map();
const VALIDADE = 3000;

export async function ler(chave, { usarCache = false } = {}) {
  const c = cache.get(chave);
  if (usarCache && c && Date.now() - c.t < VALIDADE) return { valor: c.valor, etag: c.etag };
  let valor = null, etag = null;
  if (naMemoria()) {
    const m = memoria.get(chave);
    if (m) { valor = JSON.parse(m.json); etag = m.etag; }
  } else {
    const r = await get(chave + ".json", { access: "private", useCache: false });
    if (r && r.statusCode === 200) { valor = JSON.parse(await new Response(r.stream).text()); etag = r.blob.etag; }
  }
  cache.set(chave, { valor, etag, t: Date.now() });
  return { valor, etag };
}

async function gravar(chave, valor, etag) {
  const json = JSON.stringify(valor);
  if (naMemoria()) {
    const atual = memoria.get(chave);
    if ((atual ? atual.etag : null) !== etag) throw new Conflito();
    memoria.set(chave, { json, etag: "m" + ++contador });
    return;
  }
  await put(chave + ".json", json, {
    access: "private", addRandomSuffix: false, contentType: "application/json", cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
}

// lê, aplica a mudança e grava; se a função devolver undefined, nada é gravado
export async function atualizar(chave, mudar, tentativas = 6) {
  for (let i = 0; i < tentativas; i++) {
    const { valor, etag } = await ler(chave);
    const novo = await mudar(valor);
    if (novo === undefined) return valor;
    try {
      await gravar(chave, novo, etag);
      cache.set(chave, { valor: novo, etag: null, t: 0 }); // a próxima leitura busca a etag nova
      return novo;
    } catch (e) {
      if (!ehConflito(e)) throw e;
      cache.delete(chave);
      await new Promise(r => setTimeout(r, 40 + Math.random() * 120 * (i + 1)));
    }
  }
  throw Object.assign(new Error("Muita gente salvando ao mesmo tempo. Tente de novo."), { status: 409 });
}
