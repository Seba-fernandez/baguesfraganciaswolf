// resolverNombre.js — a que perfume de la base se parece un nombre con estrellas.
//
// Unlock tapa letras del nombre con una "*" ("P*L* R*D" es Polo Red). El nombre
// del catalogo nunca se usa tal cual: para un codigo que ya esta en la base
// manda el nombre de la base, y para un codigo nuevo esta funcion SUGIERE a que
// perfume se parece. Sebas confirma con un toque; no se aplica nada solo.
//
// Cuatro niveles, se devuelve el primero que encuentre algo (hasta 3 perfumes):
//   1. igual, con "*" como una letra cualquiera            (P*L* R*D  -> Polo Red)
//   2. las mismas palabras en otro orden                   (RED P*L*  -> Polo Red)
//   3. las palabras del catalogo son parte del nombre oficial, que es mas largo
//                                                          (H*RR*RA F*R WOMEN -> Carolina Herrera for Women)
//   4. un error de tipeo: distancia de edicion de 1 (nombres de hasta 8 letras)
//      o de 2 (mas largos)                                 (AQUA DI GIO -> Acqua di Gio)
// Funcion pura: se prueba sin navegador ni base.

const plano = (t) => String(t || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .replace(/[^a-z0-9* ]+/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

/** "UNLOCK P*L* R*D 100 ML" -> "p*l* r*d" */
export function limpiarTitulo(titulo) {
  return plano(titulo).replace(/^unlock\s+/, '').replace(/\s+\d+\s?ml$/, '').trim();
}

/** Una palabra del catalogo (con "*") contra una palabra oficial: misma cantidad de letras. */
function palabraIgual(conEstrellas, oficial) {
  if (conEstrellas.length !== oficial.length) return false;
  for (let i = 0; i < oficial.length; i++) {
    if (conEstrellas[i] !== '*' && conEstrellas[i] !== oficial[i]) return false;
  }
  return true;
}

/** Cada palabra del catalogo con una palabra distinta del oficial (sin importar el orden). */
function palabrasContenidas(palabras, oficiales) {
  const usadas = new Set();
  for (const w of palabras) {
    const i = oficiales.findIndex((o, k) => !usadas.has(k) && palabraIgual(w, o));
    if (i < 0) return false;
    usadas.add(i);
  }
  return true;
}

/** Distancia de edicion donde "*" vale por cualquier letra. */
export function distanciaConEstrellas(a, b) {
  const m = a.length;
  const n = b.length;
  let anterior = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const actual = [i];
    for (let j = 1; j <= n; j++) {
      const costo = a[i - 1] === b[j - 1] || a[i - 1] === '*' ? 0 : 1;
      actual[j] = Math.min(anterior[j] + 1, actual[j - 1] + 1, anterior[j - 1] + costo);
    }
    anterior = actual;
  }
  return anterior[n];
}

const LETRAS_MINIMAS_PARCIAL = 6;

/**
 * Sugiere perfumes de la base para un titulo del catalogo.
 * `filas`: los perfumes de la base ({ id, nombre, inspirado_en }).
 * Devuelve [{ id, nombre, nivel }] (nivel 1 a 4), vacio si no hay parecido claro.
 */
export function sugerirPerfume(titulo, filas) {
  const limpio = limpiarTitulo(titulo);
  if (limpio.replace(/[* ]/g, '').length < 2) return [];
  const palabras = limpio.split(' ');
  const nombres = [];
  for (const f of filas || []) {
    for (const n of new Set([f.nombre, f.inspirado_en].filter(Boolean))) nombres.push({ f, clave: plano(n) });
  }

  const unicos = (lista) => {
    const vistos = new Set();
    const out = [];
    for (const { f } of lista) {
      if (vistos.has(f.id)) continue;
      vistos.add(f.id);
      out.push({ id: f.id, nombre: f.nombre });
    }
    return out;
  };

  const nivel1 = nombres.filter((n) => palabraIgual(limpio, n.clave));
  if (nivel1.length) return unicos(nivel1).slice(0, 3).map((x) => ({ ...x, nivel: 1 }));

  const nivel2 = nombres.filter((n) => {
    const of = n.clave.split(' ');
    return of.length === palabras.length && palabrasContenidas(palabras, of);
  });
  if (nivel2.length) return unicos(nivel2).slice(0, 3).map((x) => ({ ...x, nivel: 2 }));

  const letras = palabras.join('').length;
  if (palabras.length >= 2 && letras >= LETRAS_MINIMAS_PARCIAL) {
    const nivel3 = nombres.filter((n) => {
      const of = n.clave.split(' ');
      return of.length > palabras.length && palabrasContenidas(palabras, of);
    });
    // Solo si lo parcial apunta a un unico perfume: "for women" solo no alcanza.
    const unico = unicos(nivel3);
    if (unico.length === 1) return [{ ...unico[0], nivel: 3 }];
  }

  const tope = limpio.length <= 8 ? 1 : 2;
  const nivel4 = nombres
    .map((n) => ({ ...n, d: distanciaConEstrellas(limpio, n.clave) }))
    .filter((n) => n.d <= tope)
    .sort((a, b) => a.d - b.d);
  return unicos(nivel4).slice(0, 3).map((x) => ({ ...x, nivel: 4 }));
}
