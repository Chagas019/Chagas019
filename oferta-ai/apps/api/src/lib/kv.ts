import { Prisma } from "@prisma/client";
import { env } from "../config/env";
import { prisma, redis } from "./core";

/**
 * Armazenamento chave-valor usado por cursores, locks, contadores e conjuntos.
 * - Com REDIS_URL: Redis (modo worker contínuo com BullMQ).
 * - Sem REDIS_URL: PostgreSQL (tabela KvStore) — modo serverless/agendado, sem dependências extras.
 */
export interface Kv {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  /** Grava somente se a chave não existir (ou tiver expirado). Retorna true se adquiriu. */
  setNx(key: string, value: string, ttlMs: number): Promise<boolean>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  smembers(key: string): Promise<string[]>;
  sadd(key: string, ...values: string[]): Promise<void>;
  srem(key: string, ...values: string[]): Promise<void>;
  ping(): Promise<void>;
}

export const redisEnabled = () => Boolean(env.REDIS_URL);

const redisKv: Kv = {
  get: (k) => redis().get(k),
  set: async (k, v) => void (await redis().set(k, v)),
  setNx: async (k, v, ttl) => (await redis().set(k, v, "PX", ttl, "NX")) === "OK",
  del: async (k) => void (await redis().del(k)),
  incr: (k) => redis().incr(k),
  smembers: (k) => redis().smembers(k),
  sadd: async (k, ...v) => void (v.length && (await redis().sadd(k, ...v))),
  srem: async (k, ...v) => void (v.length && (await redis().srem(k, ...v))),
  ping: async () => void (await redis().ping()),
};

const alive = (r: { expiresAt: Date | null } | null) => r && (!r.expiresAt || r.expiresAt.getTime() > Date.now());

const pgKv: Kv = {
  async get(key) {
    const r = await prisma.kvStore.findUnique({ where: { key } });
    return alive(r) ? r!.value : null;
  },
  async set(key, value) {
    await prisma.kvStore.upsert({ where: { key }, create: { key, value }, update: { value, expiresAt: null } });
  },
  async setNx(key, value, ttlMs) {
    const expiresAt = new Date(Date.now() + ttlMs);
    try {
      await prisma.kvStore.create({ data: { key, value, expiresAt } });
      return true;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      // existe: só assume se o registro anterior expirou (update condicional = atômico)
      const r = await prisma.kvStore.updateMany({ where: { key, expiresAt: { lt: new Date() } }, data: { value, expiresAt } });
      return r.count === 1;
    }
  },
  async del(key) {
    await prisma.kvStore.deleteMany({ where: { key } });
  },
  async incr(key) {
    // incremento atômico no banco
    const rows = await prisma.$transaction(async (tx) => {
      await tx.kvStore.upsert({ where: { key }, create: { key, value: "0" }, update: {} });
      const cur = await tx.kvStore.findUniqueOrThrow({ where: { key } });
      const next = Number(cur.value ?? 0) + 1;
      const u = await tx.kvStore.updateMany({ where: { key, value: cur.value }, data: { value: String(next) } });
      return u.count === 1 ? next : null;
    });
    return rows ?? this.incr(key);
  },
  async smembers(key) {
    const v = await this.get(key);
    return v ? (JSON.parse(v) as string[]) : [];
  },
  async sadd(key, ...values) {
    const cur = new Set(await this.smembers(key));
    values.forEach((v) => cur.add(v));
    await this.set(key, JSON.stringify([...cur]));
  },
  async srem(key, ...values) {
    const cur = (await this.smembers(key)).filter((v) => !values.includes(v));
    await this.set(key, JSON.stringify(cur));
  },
  async ping() {
    await prisma.$queryRaw`SELECT 1`;
  },
};

export const kv = (): Kv => (redisEnabled() ? redisKv : pgKv);
