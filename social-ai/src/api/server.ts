import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { getSessionUser, hasRole, type Role, type SessionUser } from '../security/auth.js';
import { GraphApiError, IntegrationUnavailableError, PermanentError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { mediaDir } from '../agents/creativeStudio.js';
import { registerRoutes } from './routes.js';
import { ZodError } from 'zod';

declare module 'fastify' {
  interface FastifyRequest { user: SessionUser | null }
}

export const SESSION_COOKIE = 'sai_session';

export function requireRole(min: Role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.user) return reply.code(401).send({ error: 'Não autenticado' });
    if (!hasRole(req.user, min)) return reply.code(403).send({ error: 'Permissão insuficiente' });
  };
}

export async function buildServer() {
  const app = Fastify({ logger: false, bodyLimit: 5 * 1024 * 1024, trustProxy: true });
  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  app.decorateRequest('user', null);
  app.addHook('onRequest', async (req) => {
    req.user = getSessionUser(req.cookies[SESSION_COOKIE]);
  });

  // Cabeçalhos de segurança
  app.addHook('onSend', async (req, reply, payload) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (!req.url.startsWith('/media/public/')) {
      reply.header('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'none'");
    }
    return payload;
  });

  // Proteção CSRF: mutações exigem JSON + mesma origem (cookie SameSite=Strict reforça).
  app.addHook('preHandler', async (req, reply) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.url.startsWith('/api/')) {
      const origin = req.headers.origin;
      if (origin && req.headers.host && new URL(origin).host !== req.headers.host) return reply.code(403).send({ error: 'Origem inválida' });
    }
  });

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: 'Dados inválidos', issues: err.issues });
    if (err instanceof PermanentError) return reply.code(422).send({ error: err.message });
    if (err instanceof IntegrationUnavailableError) return reply.code(503).send({ error: err.message, integration: err.integration });
    if (err instanceof GraphApiError) return reply.code(502).send({ error: err.message, code: err.code });
    if (err.statusCode && err.statusCode < 500) return reply.code(err.statusCode).send({ error: err.message });
    logger.error(`Erro na API ${req.method} ${req.url}: ${err.message}`, { stack: err.stack });
    return reply.code(500).send({ error: 'Erro interno' });
  });

  // Mídias públicas para a Graph API baixar (nomes aleatórios de 144 bits, sem listagem).
  app.get('/media/public/:file', async (req, reply) => {
    const { file } = req.params as { file: string };
    if (!/^[A-Za-z0-9_-]{20,}\.(jpg|mp4)$/.test(file)) return reply.code(404).send();
    const full = path.join(mediaDir(), file);
    if (!fs.existsSync(full)) return reply.code(404).send();
    reply.header('Cache-Control', 'public, max-age=86400');
    reply.type(file.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
    return reply.send(fs.createReadStream(full));
  });

  await registerRoutes(app);

  // Painel (SPA) compilado
  const here = path.dirname(fileURLToPath(import.meta.url));
  const webDist = [path.resolve(here, '../../dist-web'), path.resolve(here, '../dist-web'), path.resolve('dist-web')].find((p) => fs.existsSync(p));
  if (webDist) {
    await app.register(fastifyStatic, { root: webDist, prefix: '/', wildcard: false });
    app.setNotFoundHandler((req, reply) => {
      if (req.url.startsWith('/api/') || req.url.startsWith('/media/')) return reply.code(404).send({ error: 'Não encontrado' });
      return reply.sendFile('index.html');
    });
  }
  return app;
}

export function cookieOptions() {
  return { path: '/', httpOnly: true, sameSite: 'strict' as const, secure: env().NODE_ENV === 'production', maxAge: 12 * 3600 };
}
