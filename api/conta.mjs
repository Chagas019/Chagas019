// Função do Vercel: contas da Comunica+Fé (criar conta, entrar, progresso e acesso à equipe).
// GET  /api/conta            -> { ativo, conta? }  (conta só com o token de quem pediu)
// POST /api/conta { acao }   -> criar | entrar | progresso | senha | equipe | papel | redefinir
// A primeira conta criada vira coordenação; as outras entram como visitantes até a coordenação liberar.
// O progresso da formação fica num arquivo por pessoa (progresso/<id>), para não reescrever o arquivo das contas.
import { randomUUID, randomInt } from "node:crypto";
import { configurado } from "./_lib/armazem.mjs";
import { corpoDe, tem } from "./_lib/pedido.mjs";
import { CONTAS, ler, atualizar, criarToken, hashSenha, senhaConfere, gastarTempo, normLogin, tipoLogin, nomeValido, senhaValida, publica, contaDoPedido, daCoordenacao } from "./_lib/sessao.mjs";

// limites por instância: 8 senhas erradas por login a cada 15 minutos, 6 contas novas por endereço por hora
const erros = new Map(), cadastros = new Map();
function contar(mapa, chave, janela, max, somar) {
  const agora = Date.now(), lista = (mapa.get(chave) || []).filter(t => agora - t < janela);
  if (somar) lista.push(agora);
  if (lista.length) mapa.set(chave, lista); else mapa.delete(chave);
  if (mapa.size > 5000) for (const [k, v] of mapa) if (!v.some(t => agora - t < janela)) mapa.delete(k); // limpeza
  return lista.length >= max;
}
const ipDe = req => String((req.headers && req.headers["x-forwarded-for"]) || "").split(",")[0].trim();
const progressoLimpo = p => {
  const lista = (v, n) => Array.isArray(v) ? v.filter(x => typeof x === "string" || typeof x === "number").slice(0, n).map(String).map(x => x.slice(0, 40)) : [];
  const quiz = {};
  if (p && p.quiz && typeof p.quiz === "object") for (const [k, v] of Object.entries(p.quiz).slice(0, 60)) if (typeof v === "number" && isFinite(v)) quiz[String(k).slice(0, 20)] = v;
  return { lidas: lista(p && p.lidas, 400), quiz, camDesafios: lista(p && p.camDesafios, 60), camCat: p && typeof p.camCat === "string" ? p.camCat.slice(0, 30) : null, atualizadoEm: Date.now() };
};
const juntar = (a = {}, b = {}) => {
  const quiz = { ...(a.quiz || {}) };
  for (const [k, v] of Object.entries(b.quiz || {})) quiz[k] = Math.max(quiz[k] ?? 0, v);
  return { lidas: [...new Set([...(a.lidas || []), ...(b.lidas || [])])].slice(0, 400), quiz,
    camDesafios: [...new Set([...(a.camDesafios || []), ...(b.camDesafios || [])])].slice(0, 60), camCat: b.camCat || a.camCat || null, atualizadoEm: Date.now() };
};
const PROGRESSO = id => "progresso/" + id;
const lerProgresso = async id => (await ler(PROGRESSO(id))).valor || null;
const somarProgresso = (id, p) => atualizar(PROGRESSO(id), v => juntar(v || {}, progressoLimpo(p)));
const senhaProvisoria = () => Array.from({ length: 8 }, () => "abcdefghjkmnpqrstuvwxyz23456789"[randomInt(31)]).join("");

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (!configurado()) return res.status(req.method === "GET" ? 200 : 503).json(req.method === "GET" ? { ativo: false } : { erro: "As contas ainda não foram ativadas neste site." });
  try {
    if (req.method === "GET") {
      const c = await contaDoPedido(req);
      return res.status(200).json({ ativo: true, conta: publica(c), progresso: c ? await lerProgresso(c.id) : null });
    }
    if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
    const b = corpoDe(req), acao = b.acao;

    if (acao === "criar") {
      if (contar(cadastros, ipDe(req), 3600e3, 6, false)) return res.status(429).json({ erro: "Muitas contas criadas daqui em pouco tempo. Tente de novo mais tarde." });
      const nome = String(b.nome ?? "").trim().replace(/\s+/g, " "), login = normLogin(b.login), tipo = tipoLogin(login);
      if (!nomeValido(nome)) return res.status(400).json({ erro: "Escreva seu nome." });
      if (!tipo) return res.status(400).json({ erro: "Use um e-mail ou um nome de usuário (3 a 30 letras, números, ponto, traço ou sublinhado, sem espaço)." });
      if (!senhaValida(b.senha)) return res.status(400).json({ erro: "A senha precisa ter pelo menos 6 caracteres." });
      const { sal, hash } = await hashSenha(b.senha);
      let criada = null, existe = false;
      await atualizar(CONTAS, v => {
        const tudo = v && v.contas ? v : { contas: {} };
        if (Object.values(tudo.contas).some(c => c.login === login)) { existe = true; return undefined; }
        if (Object.keys(tudo.contas).length >= 2000) throw Object.assign(new Error("O site chegou ao limite de contas."), { status: 507 });
        const primeira = !Object.keys(tudo.contas).length;
        criada = { id: randomUUID(), nome, login, tipo, sal, hash, sv: 0, papel: primeira ? "coordenacao" : null, criadoEm: Date.now() };
        return { contas: { ...tudo.contas, [criada.id]: criada } };
      });
      if (existe) return res.status(409).json({ erro: "Já existe uma conta com esse e-mail ou nome de usuário. Toque em “Entrar”." });
      contar(cadastros, ipDe(req), 3600e3, 6, true);
      const progresso = await somarProgresso(criada.id, b.progresso);
      return res.status(200).json({ token: criarToken(criada), conta: publica(criada), progresso });
    }

    if (acao === "entrar") {
      const login = normLogin(b.login), chaveErro = login + "|" + ipDe(req);
      if (contar(erros, chaveErro, 15 * 60e3, 8, false)) return res.status(429).json({ erro: "Muitas tentativas seguidas. Espere 15 minutos e tente de novo." });
      const { valor } = await ler(CONTAS);
      const c = valor && valor.contas ? Object.values(valor.contas).find(x => x.login === login) : null;
      const certa = typeof b.senha === "string" && (c ? await senhaConfere(b.senha, c) : await gastarTempo(b.senha));
      if (!certa) { contar(erros, chaveErro, 15 * 60e3, 8, true); return res.status(401).json({ erro: "E-mail, usuário ou senha incorretos." }); }
      return res.status(200).json({ token: criarToken(c), conta: publica(c), progresso: await lerProgresso(c.id) });
    }

    const eu = await contaDoPedido(req);
    if (!eu) return res.status(401).json({ erro: "Sua sessão acabou. Entre de novo." });

    if (acao === "progresso") return res.status(200).json({ progresso: await somarProgresso(eu.id, b.progresso) });

    if (acao === "senha") {
      if (typeof b.atual !== "string" || !(await senhaConfere(b.atual, eu))) return res.status(401).json({ erro: "A senha atual não confere." });
      if (!senhaValida(b.nova)) return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 6 caracteres." });
      const { sal, hash } = await hashSenha(b.nova);
      let nova = null;
      await atualizar(CONTAS, v => { const c = v.contas[eu.id]; nova = { ...c, sal, hash, sv: (c.sv || 0) + 1 }; return { contas: { ...v.contas, [eu.id]: nova } }; });
      return res.status(200).json({ token: criarToken(nova), conta: publica(nova) });
    }

    // daqui para baixo, só a coordenação
    if (!daCoordenacao(eu)) return res.status(403).json({ erro: "Só a coordenação pode fazer isso." });

    if (acao === "equipe") {
      const { valor } = await ler(CONTAS);
      const lista = Object.values((valor && valor.contas) || {}).map(publica).sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
      return res.status(200).json({ contas: lista });
    }

    if (acao === "papel") {
      const papel = b.papel === "coordenacao" || b.papel === "membro" ? b.papel : null;
      let erro = null, alvo = null;
      await atualizar(CONTAS, v => {
        const c = tem(v.contas, b.id) ? v.contas[b.id] : null;
        if (!c) { erro = [404, "Conta não encontrada."]; return undefined; }
        const coords = Object.values(v.contas).filter(x => x.papel === "coordenacao");
        if (c.papel === "coordenacao" && papel !== "coordenacao" && coords.length <= 1) { erro = [400, "O site precisa de pelo menos uma pessoa na coordenação."]; return undefined; }
        alvo = { ...c, papel };
        return { contas: { ...v.contas, [c.id]: alvo } };
      });
      if (erro) return res.status(erro[0]).json({ erro: erro[1] });
      return res.status(200).json({ conta: publica(alvo) });
    }

    if (acao === "redefinir") {
      const provisoria = senhaProvisoria(), { sal, hash } = await hashSenha(provisoria);
      let achou = false;
      await atualizar(CONTAS, v => {
        const c = tem(v.contas, b.id) ? v.contas[b.id] : null; if (!c) return undefined;
        achou = true;
        return { contas: { ...v.contas, [c.id]: { ...c, sal, hash, sv: (c.sv || 0) + 1 } } };
      });
      if (!achou) return res.status(404).json({ erro: "Conta não encontrada." });
      return res.status(200).json({ senha: provisoria });
    }

    return res.status(400).json({ erro: "Ação desconhecida." });
  } catch (e) {
    if (e && e.status) return res.status(e.status).json({ erro: e.message });
    console.error("conta", e && e.message);
    return res.status(500).json({ erro: "Não foi possível agora. Tente de novo." });
  }
}
