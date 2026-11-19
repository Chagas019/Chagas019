import { loadEnv } from '../config/env.js';
import { getDb } from '../db/db.js';
import { createUser, type Role } from '../security/auth.js';
loadEnv();
getDb();
const [email, password, role = 'admin', name = 'Administrador'] = process.argv.slice(2);
if (!email || !password) {
  console.error('Uso: npm run admin:create -- <email> <senha (>=12)> [admin|editor|viewer] [nome]');
  process.exit(1);
}
createUser(email, name, password, role as Role);
console.log(`Usuário ${email} (${role}) criado.`);
