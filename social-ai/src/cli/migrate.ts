import { loadEnv } from '../config/env.js';
import { getDb } from '../db/db.js';
loadEnv();
getDb();
console.log('Migrações aplicadas.');
