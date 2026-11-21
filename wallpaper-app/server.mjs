// Servidor estático mínimo, sem dependências: `node server.mjs` → http://localhost:5173
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const PORT = Number(process.env.PORT) || 5173;
// Somente os arquivos do app são servidos (nada de package.json, testes ou README).
const PUBLIC = /^(index\.html|sw\.js|icon\.svg|manifest\.webmanifest|css\/[\w.-]+\.css|js\/[\w.-]+\.js)$/;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json',
  '.json': 'application/json', '.ico': 'image/x-icon',
};

export function startServer(port = PORT) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      let path = decodeURIComponent(url.pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(ROOT, path));
      const rel = file.slice(ROOT.length + 1);
      if (!file.startsWith(ROOT + sep) || !PUBLIC.test(rel.split(sep).join('/'))) {
        res.writeHead(403).end('Proibido');
        return;
      }
      const info = await stat(file);
      if (!info.isFile()) throw new Error('não é arquivo');
      res.writeHead(200, {
        'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
    }
  });
  return new Promise((ok) => server.listen(port, () => ok(server)));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  startServer().then(() => console.log(`Aura Wallpapers em http://localhost:${PORT}`));
}
