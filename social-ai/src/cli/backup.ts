import { loadEnv } from '../config/env.js';
import { runBackup } from '../lib/backup.js';
loadEnv();
console.log(runBackup());
