import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { env } from "../config/env";
import { prisma } from "../lib/core";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const RANK: Record<Role, number> = { VIEWER: 1, OPERATOR: 2, ADMIN: 3 };

export const hashPassword = (p: string) => bcrypt.hash(p, 12);

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  // compara mesmo sem usuário para evitar enumeração por tempo de resposta
  const ok = await bcrypt.compare(password, user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv");
  if (!user || !ok || !user.active) return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const token = jwt.sign({ sub: user.id, role: user.role }, env.JWT_SECRET, { algorithm: "HS256", expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"] });
  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization;
  if (!h?.startsWith("Bearer ")) return res.status(401).json({ error: "não autenticado" });
  try {
    const payload = jwt.verify(h.slice(7), env.JWT_SECRET, { algorithms: ["HS256"] }) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) return res.status(401).json({ error: "usuário inválido" });
    req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    next();
  } catch {
    return res.status(401).json({ error: "token inválido ou expirado" });
  }
}

export const requireRole = (role: Role) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || RANK[req.user.role] < RANK[role]) return res.status(403).json({ error: `requer perfil ${role}` });
  next();
};

export async function audit(req: Request, action: string, target?: string, meta?: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: { userId: req.user?.id, action, target, meta: meta as Prisma.InputJsonValue | undefined, ip: req.ip },
  });
}
