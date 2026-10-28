// Função do Vercel: Criador de conteúdo da Comunica+Fé.
// Recebe o pedido do formulário, monta o texto do pedido aqui no servidor e chama a API do Claude.
// A chave fica só na variável de ambiente ANTHROPIC_API_KEY do Vercel e nunca vai para o navegador.
// Só a equipe usa: o pedido precisa do token de login do Firebase de alguém com documento em equipe/{uid}.
// Chamada direta com fetch, sem dependências: o projeto no Vercel publica sem etapa de instalação.
import { createPublicKey, createVerify } from "node:crypto";

const MODELO = "claude-opus-5-5";
const TIPOS = {
  legenda: "Legenda para Instagram", reels: "Roteiro de Reels", ideias: "Ideias de conteúdo", ganchos: "Ganchos para os primeiros segundos de vídeo",
  cta: "Chamadas para ação", stories: "Sequência de Stories", carrossel: "Carrossel educativo", evento: "Texto de divulgação de evento",
  enquete: "Perguntas e enquetes", calendario: "Calendário editorial",
};
const TAMANHOS = { curto: "curto e direto", medio: "de tamanho médio", longo: "mais completo" };
const SISTEMA = `Você ajuda a equipe de comunicação de uma comunidade católica no Brasil a criar conteúdo para redes sociais. Escreva em português do Brasil, fiel à doutrina da Igreja Católica.
Regras:
- Nunca invente citações da Bíblia, de documentos da Igreja, do Papa ou de santos. Só cite um texto se ele estiver nas informações do pedido; se uma citação ajudar, escreva [inserir citação conferida].
- Não invente datas, horários, nomes, locais ou preços: use só o que está no pedido e escreva [a confirmar] onde faltar.
- Nada de sensacionalismo, promessas de milagre ou ataques a pessoas e a outras religiões.
- Não cite emissoras, conferências de bispos, movimentos ou outras instituições, nem as apresente como parceiras, responsáveis ou apoiadoras do conteúdo, a não ser que o pedido traga esse nome.
- Fotos e vídeos de crianças só com autorização dos responsáveis: lembre disso quando sugerir imagens.
- Entregue só o conteúdo pronto, organizado e fácil de copiar, sem explicar o que você fez.`;

const curto = (v, n) => String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, n);
export function montarPedido(b) {
  const tipo = TIPOS[b.tipo] ? b.tipo : "legenda";
  const tema = curto(b.tema, 1200);
  if (tema.length < 8) return null;
  return `Pedido: ${TIPOS[tipo]}, ${TAMANHOS[b.tamanho] || TAMANHOS.medio}, para ${curto(b.plataforma, 30) || "Instagram"}.
Objetivo: ${curto(b.objetivo, 80) || "Evangelizar"}.
Público: ${curto(b.publico, 80) || "Toda a comunidade"}.
Tom: ${curto(b.tom, 30) || "Acolhedor"}.
Tema e informações da comunidade: ${tema}`;
}

/* login: confere o token do Firebase (assinatura do Google, projeto e validade) e se a pessoa é da equipe */
let certs = { ate: 0, chaves: {} };
async function chavesGoogle() {
  if (Date.now() < certs.ate) return certs.chaves;
  const r = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  if (!r.ok) throw new Error("certificados");
  const idade = +((r.headers.get("cache-control") || "").match(/max-age=(\d+)/) || [])[1] || 3600;
  certs = { ate: Date.now() + idade * 1000, chaves: await r.json() };
  return certs.chaves;
}
const b64url = s => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
export async function conferirToken(token, projeto, chaves) {
  const partes = String(token || "").split(".");
  if (partes.length !== 3) return null;
  let cab, dados;
  try { cab = JSON.parse(b64url(partes[0]).toString()); dados = JSON.parse(b64url(partes[1]).toString()); } catch { return null; }
  if (cab.alg !== "RS256" || !chaves[cab.kid]) return null;
  const v = createVerify("RSA-SHA256"); v.update(partes[0] + "." + partes[1]);
  if (!v.verify(createPublicKey(chaves[cab.kid]), b64url(partes[2]))) return null;
  const agora = Math.floor(Date.now() / 1000);
  if (dados.aud !== projeto || dados.iss !== `https://securetoken.google.com/${projeto}` || !dados.sub || dados.exp <= agora || dados.iat > agora + 60) return null;
  return dados.sub;
}
async function daEquipe(uid, token, projeto) {
  // lê equipe/{uid} com o próprio token da pessoa: as regras do Firestore decidem se ela pode ler
  const r = await fetch(`https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/equipe/${encodeURIComponent(uid)}`, { headers: { authorization: "Bearer " + token } });
  return r.ok;
}

/* limite simples por pessoa (por instância da função): 20 pedidos por hora */
const usos = new Map();
function dentroDoLimite(uid) {
  const agora = Date.now(), lista = (usos.get(uid) || []).filter(t => agora - t < 3600e3);
  if (lista.length >= 20) return false;
  lista.push(agora); usos.set(uid, lista); return true;
}

export default async function handler(req, res) {
  const chave = process.env.ANTHROPIC_API_KEY, projeto = process.env.FIREBASE_PROJECT_ID, semLogin = process.env.CONTEUDO_SEM_LOGIN === "1";
  const falta = [...(chave ? [] : ["chave"]), ...(projeto || semLogin ? [] : ["login"])];
  res.setHeader("cache-control", "no-store");
  if (req.method === "GET") return res.status(200).json({ configurado: !falta.length, exigeLogin: !semLogin, falta });
  if (req.method !== "POST") return res.status(405).json({ erro: "Método não permitido." });
  if (falta.length) return res.status(503).json({ erro: "A IA ainda não foi ativada neste site." });

  let uid = "aberto";
  if (!semLogin) {
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    try { uid = token ? await conferirToken(token, projeto, await chavesGoogle()) : null; } catch { return res.status(503).json({ erro: "Não foi possível conferir o login agora. Tente de novo." }); }
    if (!uid) return res.status(401).json({ erro: "Entre com a conta da equipe (aba Perfil) para usar a IA." });
    if (!(await daEquipe(uid, token, projeto).catch(() => false))) return res.status(403).json({ erro: "Sua conta ainda não faz parte da equipe. Peça acesso à coordenação." });
  }
  if (!dentroDoLimite(uid)) return res.status(429).json({ erro: "Muitos pedidos seguidos. Espere um pouco e tente de novo." });

  const corpo = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return {}; } })() : req.body || {};
  const pedido = montarPedido(corpo);
  if (!pedido) return res.status(400).json({ erro: "Escreva o tema e as informações da comunidade." });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chave, "anthropic-version": "2026-10-21", "anthropic-beta": "server-side-fallback-2026-07-01" },
      body: JSON.stringify({
        model: MODELO, max_tokens: 16000, fallbacks: "default",
        output_config: { effort: "medium" },
        system: SISTEMA,
        messages: [{ role: "user", content: pedido }],
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 429) return res.status(429).json({ erro: "A IA está com muitos pedidos agora. Tente de novo em instantes." });
    if (!r.ok) { console.error("anthropic", r.status, d && d.error && d.error.type); return res.status(502).json({ erro: "A IA não respondeu agora. Tente de novo." }); }
    if (d.stop_reason === "refusal") return res.status(422).json({ erro: "A IA não quis responder a esse pedido. Reescreva o tema com outras palavras." });
    const texto = (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (!texto) return res.status(502).json({ erro: "A IA não devolveu texto. Tente de novo." });
    return res.status(200).json({ texto, cortado: d.stop_reason === "max_tokens" });
  } catch (e) {
    console.error("conteudo", e && e.message);
    return res.status(502).json({ erro: "A IA não respondeu agora. Tente de novo." });
  }
}
