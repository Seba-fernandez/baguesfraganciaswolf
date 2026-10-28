// La politica de seguridad (Content-Security-Policy en vercel.json) solo deja
// correr los scripts en linea cuyo hash figura ahi. Si alguien cambia uno de los
// <script> de index.html (el de las fuentes o el de la vuelta del ingreso con
// Google), el navegador lo bloquea en silencio y, por ejemplo, el ingreso al
// panel deja de andar. Por eso el build se frena y dice que hash poner.
import { createHash } from 'node:crypto';

/** La CSP declarada en vercel.json (texto). */
export function cspDe(config) {
  return (config.headers || [])
    .flatMap((h) => h.headers)
    .find((h) => h.key === 'Content-Security-Policy')?.value || '';
}

/** Los hashes de los scripts en linea del HTML que la CSP no permite. Pura. */
export function scriptsSinPermiso(html, csp) {
  const faltan = [];
  for (const [, atributos, cuerpo] of html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/type="(application\/(ld\+)?json)"/.test(atributos)) continue;
    const hash = `'sha256-${createHash('sha256').update(cuerpo).digest('base64')}'`;
    if (!csp.includes(hash)) faltan.push(hash);
  }
  return faltan;
}
