// Contas e sessões da Comunica+Fé, sem depender de Google, Facebook ou confirmação por e-mail.
// A pessoa entra com e-mail ou nome de usuário e uma senha. A senha é guardada só como hash (scrypt).
// A sessão é um token assinado (HMAC) que o site guarda no aparelho e manda em cada pedido.
import { scrypt, randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { ler, atualizar } from "./armazem.mjs";
import { tokenDe, tem } from "./pedido.mjs";

export const CONTAS = "contas";
const DIAS_SESSAO = 60;

// chave de assinatura: SESSAO_SEGREDO, ou derivada do token do Blob (que já é secreto e só existe no servidor)
function chave() {
  const base = process.env.SESSAO_SEGREDO || process.env.BLOB_READ_WRITE_TOKEN || (process.env.ARMAZEM === "memoria" ? "teste" : "");
  if (!base) throw Object.assign(new Error("sem chave"), { status: 503 });
  return createHmac("sha256", base).update("comunicafe:sessao:v1").digest();
}
const b64 = b => Buffer.from(b).toString("base64url");
const assinar = texto => b64(createHmac("sha256", chave()).update(texto).digest());

export function criarToken(conta) {
  const corpo = b64(JSON.stringify({ i: conta.id, v: conta.sv || 0, e: Date.now() + DIAS_SESSAO * 864e5 }));
  return corpo + "." + assinar(corpo);
}
export function lerToken(token) {
  const [corpo, ass] = String(token || "").split(".");
  if (!corpo || !ass) return null;
  const certa = Buffer.from(assinar(corpo)), dada = Buffer.from(ass);
  if (certa.length !== dada.length || !timingSafeEqual(certa, dada)) return null;
  try {
    const d = JSON.parse(Buffer.from(corpo, "base64url").toString());
    return d && typeof d.i === "string" && d.e > Date.now() ? d : null;
  } catch { return null; }
}

const scryptP = (senha, sal) => new Promise((ok, falha) => scrypt(senha, sal, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? falha(e) : ok(k)));
export async function hashSenha(senha) {
  const sal = randomBytes(16);
  return { sal: sal.toString("base64"), hash: (await scryptP(senha, sal)).toString("base64") };
}
export async function senhaConfere(senha, conta) {
  if (!conta || typeof conta.sal !== "string" || typeof conta.hash !== "string") return false;
  const k = await scryptP(senha, Buffer.from(conta.sal, "base64")), h = Buffer.from(conta.hash, "base64");
  return k.length === h.length && timingSafeEqual(k, h);
}
// quando o login não existe, gasta o mesmo tempo de uma senha de verdade: a demora não revela quem tem conta
const FALSA = { sal: randomBytes(16).toString("base64"), hash: randomBytes(64).toString("base64") };
export const gastarTempo = senha => senhaConfere(String(senha || ""), FALSA).then(() => false);

// regras de cada campo
export const normLogin = v => String(v ?? "").trim().toLowerCase();
export function tipoLogin(login) {
  if (/^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/.test(login)) return "email";
  if (/^[a-z0-9][a-z0-9._-]{2,29}$/.test(login)) return "usuario";
  return null;
}
export const nomeValido = n => typeof n === "string" && n.replace(/[^\p{L}]/gu, "").length >= 2 && n.length <= 60;
export const senhaValida = s => typeof s === "string" && s.length >= 6 && s.length <= 200;

export const publica = c => c && { id: c.id, nome: c.nome, login: c.login, tipo: c.tipo, papel: c.papel || null, criadoEm: c.criadoEm };

// conta de quem fez o pedido (pelo cabeçalho Authorization), ou null
// O cache curto da instância pode ainda não ter uma conta recém-criada ou uma senha recém-trocada:
// se não bater, lê o arquivo de novo antes de recusar.
export async function contaDoPedido(req) {
  const t = lerToken(tokenDe(req));
  if (!t) return null;
  const achar = v => { const c = v && v.contas && tem(v.contas, t.i) ? v.contas[t.i] : null; return c && (c.sv || 0) === t.v ? c : null; };
  return achar((await ler(CONTAS, { usarCache: true })).valor) || achar((await ler(CONTAS)).valor);
}
export const daEquipe = c => !!c && (c.papel === "membro" || c.papel === "coordenacao");
export const daCoordenacao = c => !!c && c.papel === "coordenacao";

export { atualizar, ler };
