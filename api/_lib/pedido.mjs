// Leitura do pedido, igual para todas as funções: corpo em JSON e token do cabeçalho Authorization.
export const corpoDe = req => {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) return b;
  try { return JSON.parse(Buffer.isBuffer(b) ? b.toString() : String(b || "{}")) || {}; } catch { return {}; }
};
export const tokenDe = req => String((req.headers && (req.headers.authorization || req.headers.Authorization)) || "").replace(/^Bearer\s+/i, "");
// nomes que um objeto comum já traz de fábrica: não servem como id
export const ID_RESERVADO = new Set(["__proto__", "constructor", "prototype", "hasOwnProperty", "toString", "valueOf"]);
export const tem = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k) && !ID_RESERVADO.has(k);
