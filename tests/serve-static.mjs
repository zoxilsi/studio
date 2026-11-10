import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('out');
const prefix = '/wallpaper-studio';
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.woff2':'font/woff2' };
createServer(async (req,res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if (path !== prefix && !path.startsWith(prefix + '/')) { res.writeHead(404).end(); return; }
  const relative = path.slice(prefix.length) || '/';
  let file = resolve(root, '.' + relative);
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  if (relative.endsWith('/')) file += '/index.html';
  try { const data = await readFile(file); res.writeHead(200, {'content-type':mime[extname(file)] || 'application/octet-stream'}).end(data); }
  catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1');
