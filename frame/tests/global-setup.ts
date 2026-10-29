import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { TEST_DATABASE_URL } from "./env";

export default async function setup() {
  const client = postgres(TEST_DATABASE_URL, { max: 1, onnotice: () => {} });
  await client`drop schema if exists public cascade`;
  await client`drop schema if exists drizzle cascade`;
  await client`create schema public`;
  await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
  await client.end();
}
