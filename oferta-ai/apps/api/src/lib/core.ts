import pino from "pino";
import { PrismaClient, Prisma } from "@prisma/client";
import IORedis from "ioredis";
import { env } from "../config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "oferta-ai" },
  redact: {
    paths: ["req.headers.authorization", "req.headers.cookie", "*.token", "*.secret", "*.password", "*.apiKey"],
    censor: "[REDACTED]",
  },
});

export const prisma = new PrismaClient();

let redisSingleton: IORedis | null = null;
export function redis(): IORedis {
  if (!redisSingleton) {
    redisSingleton = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return redisSingleton;
}

/** Log estruturado + persistência para a tela "Logs do sistema". */
export async function logEvent(
  level: "debug" | "info" | "warn" | "error",
  source: string,
  message: string,
  meta?: Record<string, unknown>,
) {
  logger[level]({ source, ...meta }, message);
  if (level === "debug") return;
  try {
    await prisma.systemLog.create({
      data: { level, source, message, meta: (meta ?? undefined) as Prisma.InputJsonValue | undefined },
    });
  } catch (err) {
    logger.error({ err }, "falha ao persistir log");
  }
}

export function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
