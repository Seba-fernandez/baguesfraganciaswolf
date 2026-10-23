// Sirve dist/ como lo sirve Vercel, para correr el banco de pruebas en local:
//   npm run build && node scripts/qa/servir.mjs        (puerto 4173)
//
// `vite preview` no alcanza: contesta /catalogo con la portada (su propio
// fallback de SPA) y no lee vercel.json. Aca se respeta el orden de Vercel:
// primero el archivo si existe, despues las reescrituras de vercel.json en
// orden, y las cabeceras declaradas.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const DIST = path.join(RAIZ, 'dist');
const config = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
const PUERTO = Number(process.env.PORT || 4173);

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};

const patron = (fuente) => new RegExp(`^${fuente.replace(/\(\.\*\)/g, '(.*)')}$`);

function archivo(ruta) {
  const f = path.join(DIST, decodeURIComponent(ruta));
  if (!f.startsWith(DIST)) return null;
  return fs.existsSync(f) && fs.statSync(f).isFile() ? f : null;
}

http.createServer((req, res) => {
  const ruta = new URL(req.url, 'http://x').pathname;
  let f = archivo(ruta);
  if (!f) {
    const regla = (config.rewrites || []).find((r) => patron(r.source).test(ruta));
    if (regla) f = archivo(regla.destination);
  }
  // Como Vercel: lo que no es archivo ni ruta conocida recibe dist/404.html
  // con estado 404.
  let estado = 200;
  if (!f) {
    f = archivo('/404.html');
    estado = 404;
    if (!f) { res.writeHead(404); res.end('404'); return; }
  }
  const cabeceras = { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream' };
  for (const h of config.headers || []) {
    if (patron(h.source).test(ruta)) for (const { key, value } of h.headers) cabeceras[key] = value;
  }
  // HSTS solo tiene sentido en https. En local (http) Safari lo aplica igual y
  // pasa todo a https://localhost, que no existe: la pagina queda vacia.
  delete cabeceras['Strict-Transport-Security'];
  res.writeHead(estado, cabeceras);
  fs.createReadStream(f).pipe(res);
}).listen(PUERTO, () => console.log(`dist/ como en Vercel: http://localhost:${PUERTO}`));
