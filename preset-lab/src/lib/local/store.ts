import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type {
  Banner,
  Category,
  Collection,
  DownloadRecord,
  InspirationPost,
  Product,
  ProductFile,
  Profile,
  Purchase,
  Subscription,
} from "@/lib/types";
import { buildDemoSeed } from "./seed";

/**
 * Banco de dados do MODO LOCAL (desenvolvimento/demonstração): um arquivo JSON em .data/.
 * Escritas são serializadas por uma fila em memória e gravadas de forma atômica (rename).
 * Não é usado em produção — lá o backend é o Supabase.
 */

export interface LocalUser {
  id: string;
  email: string;
  password_hash: string;
  email_confirmed_at: string | null;
  created_at: string;
}
export interface LocalSession {
  token_hash: string;
  user_id: string;
  expires_at: string;
}
export interface LocalAuthToken {
  token_hash: string;
  user_id: string;
  type: "signup" | "recovery";
  expires_at: string;
  used: boolean;
}
export interface OutboxMail {
  id: string;
  to: string;
  subject: string;
  body: string;
  link: string;
  created_at: string;
}

export interface LocalDB {
  version: 1;
  users: LocalUser[];
  sessions: LocalSession[];
  auth_tokens: LocalAuthToken[];
  outbox: OutboxMail[];
  profiles: Profile[];
  categories: Category[];
  products: Product[];
  product_files: ProductFile[];
  collections: Collection[];
  favorites: { user_id: string; product_id: string; created_at: string }[];
  purchases: Purchase[];
  subscriptions: Subscription[];
  downloads: DownloadRecord[];
  inspiration_posts: InspirationPost[];
  banners: Banner[];
  payment_events: { id: string; provider: string; event_id: string; payload: unknown; result: string | null; created_at: string }[];
  rate_limits: Record<string, { window_start: number; hits: number }>;
}

export const dataDir = () => path.resolve(process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".data"));
const dbFile = () => path.join(dataDir(), "db.json");

let queue: Promise<unknown> = Promise.resolve();

async function load(): Promise<LocalDB> {
  try {
    return JSON.parse(await fs.readFile(dbFile(), "utf8")) as LocalDB;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = buildDemoSeed();
    await save(db);
    return db;
  }
}

async function save(db: LocalDB) {
  await fs.mkdir(dataDir(), { recursive: true });
  const tmp = `${dbFile()}.${randomUUID()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db));
  await fs.rename(tmp, dbFile());
}

/** Leitura consistente (aguarda escritas pendentes). */
export function read<T>(fn: (db: LocalDB) => T): Promise<T> {
  const run = queue.then(async () => fn(await load()));
  queue = run.catch(() => undefined);
  return run;
}

/** Transação: carrega, aplica `fn` e grava. Se `fn` lançar erro, nada é gravado. */
export function write<T>(fn: (db: LocalDB) => T): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export const now = () => new Date().toISOString();
export const uuid = () => randomUUID();
