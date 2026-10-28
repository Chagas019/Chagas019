// Função do Vercel: dados compartilhados da Comunica+Fé (agenda, escalas, avisos, frases, formação,
// integrantes e coberturas). Cada coleção é um arquivo no Blob privado: { v, docs: { id: documento } }.
// GET  /api/dados?c=agenda,escalas   -> { colecoes: { agenda: { v, docs: [...] } }, negadas: [...] }
// POST /api/dados { c, id, d }        -> grava o documento   | { c, id, apagar: true } -> apaga
// As permissões são as mesmas do firestore.rules: qualquer pessoa lê o que é público; só a equipe publica.
import { configurado, ler, atualizar } from "./_lib/armazem.mjs";
import { contaDoPedido, daEquipe, daCoordenacao } from "./_lib/sessao.mjs";
import { corpoDe, tem, ID_RESERVADO } from "./_lib/pedido.mjs";

const PUBLICAS = ["agenda", "escalas", "avisos", "frases", "formacao"];
const SO_EQUIPE = ["membros", "coberturas"];
const COLECOES = [...PUBLICAS, ...SO_EQUIPE];
const SO_COORDENACAO = ["avisos", "membros", "formacao"]; // gravar e apagar
const APAGAR_COORDENACAO = ["coberturas"];
const LIMITE_DOC = 20000, LIMITE_COLECAO = 3000;

const podeLer = (c, conta) => PUBLICAS.includes(c) || daEquipe(conta);
const podeGravar = (c, conta, apagar) => SO_COORDENACAO.includes(c) || (apagar && APAGAR_COORDENACAO.includes(c)) ? daCoordenacao(conta) : daEquipe(conta);

const texto = (d, campo, max) => !(campo in d) || (typeof d[campo] === "string" && d[campo].length <= max);
const dataValida = d => typeof d.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.data);
function documentoValido(c, d) {
  if (!d || typeof d !== "object" || Array.isArray(d)) return false;
  if (JSON.stringify(d).length > LIMITE_DOC) return false;
  if (c === "agenda") return dataValida(d) && texto(d, "titulo", 120) && texto(d, "local", 120) && texto(d, "desc", 1500);
  if (c === "escalas") return dataValida(d) && texto(d, "local", 120) && texto(d, "obs", 1500);
  if (c === "avisos") return texto(d, "titulo", 90) && texto(d, "texto", 800);
  if (c === "frases") return texto(d, "texto", 400);
  if (c === "membros") return texto(d, "nome", 60);
  if (c === "coberturas") return dataValida(d);
  return true;
}
const lista = v => ({ v: (v && v.v) || 0, docs: Object.entries((v && v.docs) || {}).map(([id, d]) => ({ ...d, id })) });

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!configurado()) return res.status(503).json({ erro: "O banco de dados ainda não foi ativado neste site." });
  try {
    const conta = await contaDoPedido(req);
    if (req.method === "GET") {
      const pedidas = String((req.query && req.query.c) || new URL(req.url, "http://x").searchParams.get("c") || "").split(",").filter(c => COLECOES.includes(c));
      const colecoes = {}, negadas = [];
      await Promise.all(pedidas.map(async c => {
        if (!podeLer(c, conta)) { negadas.push(c); return; }
        colecoes[c] = lista((await ler("dados/" + c, { usarCache: true })).valor);
      }));
      return res.status(200).json({ colecoes, negadas });
    }
    if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
    const b = corpoDe(req), c = b.c, id = b.id, apagar = b.apagar === true;
    if (!COLECOES.includes(c) || typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || ID_RESERVADO.has(id)) return res.status(400).json({ erro: "Pedido inválido." });
    if (!conta) return res.status(401).json({ erro: "Entre com a sua conta (botão Perfil) para publicar." });
    if (!podeGravar(c, conta, apagar)) return res.status(403).json({ erro: "Sua conta não tem permissão para isso. Fale com a coordenação." });
    if (!apagar && !documentoValido(c, b.d)) return res.status(400).json({ erro: "Confira os campos: algum está vazio, com data errada ou longo demais." });
    const novo = await atualizar("dados/" + c, v => {
      const docs = { ...((v && v.docs) || {}) };
      if (apagar) { if (!tem(docs, id)) return undefined; delete docs[id]; }
      else {
        if (!tem(docs, id) && Object.keys(docs).length >= LIMITE_COLECAO) throw Object.assign(new Error("Essa lista está cheia. Apague itens antigos."), { status: 507 });
        const { id: _ignora, ...doc } = b.d;
        docs[id] = doc;
      }
      return { v: ((v && v.v) || 0) + 1, docs };
    });
    return res.status(200).json({ c, ...lista(novo) });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ erro: e.message });
    console.error("dados", e && e.message);
    return res.status(500).json({ erro: "Não foi possível salvar agora. Tente de novo." });
  }
}
