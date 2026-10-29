// Comando de inicialização: prepara o ambiente e cadastra a estrutura inicial com segurança.
// Pode ser executado quantas vezes quiser: não duplica nada e não apaga histórico.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, loadEnvFile, getConfig } from '../src/config.js';
import { ensureOwnerToken } from '../src/server.js';
import { createApp } from '../src/app.js';
import { readiness, printReadiness } from '../src/readiness.js';

const [maj, min] = process.versions.node.split('.').map(Number);
if (maj < 22 || (maj === 22 && min < 13)) {
  console.error(`Node ${process.versions.node} detectado; é preciso Node 22.13 ou mais novo (node:sqlite).`);
  process.exit(1);
}
const envFile = path.join(ROOT, '.env');
if (!fs.existsSync(envFile)) fs.writeFileSync(envFile, '# Configuração do escritório virtual (veja README.md)\n# ANTHROPIC_API_KEY=\n', { mode: 0o600 });
loadEnvFile(envFile);
const { token, novo } = ensureOwnerToken(envFile);
const config = getConfig(process.env);
fs.mkdirSync(config.dataDir, { recursive: true });

const ctx = createApp({ env: process.env, config });
const { seeded, recovered } = ctx.boot;
const db = ctx.db;
console.log('Banco de dados:', config.dbFile);
console.log(`Departamentos: ${db.prepare('SELECT COUNT(*) n FROM departments').get().n} · Salas: ${db.prepare('SELECT COUNT(*) n FROM rooms').get().n} · Funcionários: ${db.prepare('SELECT COUNT(*) n FROM employees').get().n} · Rotinas: ${db.prepare('SELECT COUNT(*) n FROM routines').get().n}`);
console.log(`Seed: ${seeded.funcionarios_criados} criados, ${seeded.funcionarios_atualizados} atualizados (os demais já existiam e foram mantidos).`);
if (recovered.runs || recovered.tasks) console.log(`Recuperação: ${recovered.runs} execuções interrompidas, ${recovered.tasks} tarefas devolvidas à fila.`);
printReadiness(readiness(db, process.env));
console.log(`\nToken do proprietário ${novo ? 'gerado e salvo' : 'já existente'} em .env${novo ? `: ${token}` : ''}`);
console.log(`Inicie com: npm start  →  http://localhost:${config.port}`);
db.close();
