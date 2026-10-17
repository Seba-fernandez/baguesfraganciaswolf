// ============================================================================
// parecidos.js — "Si te gusta este, mira tambien": tres aromas cercanos al
// que se esta mirando, calculados solos con los datos del ciclo (costo por
// ciclo nulo, nada que cargar a mano).
//
// Orden:
//   1. mismo genero, o unisex de cualquiera de los dos lados (nunca se le
//      sugiere un femenino a quien mira uno masculino);
//   2. misma familia grande (lib/familias.js);
//   3. mas notas compartidas;
//   4. desempate: los destacados primero y despues el `orden` del panel.
// Nunca el mismo aroma.
//
// La razon queda a la vista: "comparte: vainilla, ambar" o, si no comparten
// notas, "tambien amaderado". Funcion pura, sin pantallas.
// ============================================================================

import { familiaDe, familiaPorId } from './familias.js';
import { esPublicable, separarNotas } from './producto.js';

const plano = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim();

/** Las notas del aroma, sin la procedencia ("de Reggio") y en minuscula. */
function notasDe(producto) {
  return [producto?.nota_salida, producto?.nota_corazon, producto?.nota_fondo]
    .flatMap((t) => separarNotas(t))
    .map((n) => n.replace(/\s+de\s+[A-ZÁÉÍÓÚÑ].*$/u, '').toLowerCase());
}

/**
 * Notas que tienen en comun, en la forma mas corta: "vainilla" y "vainilla
 * bourbon" comparten "vainilla"; "almizcle" y "almizcle blanco", "almizcle".
 */
export function notasEnComun(a, b) {
  const nb = notasDe(b);
  const comunes = [];
  for (const x of notasDe(a)) {
    for (const y of nb) {
      const px = plano(x), py = plano(y);
      const igual = px === py || py.startsWith(`${px} `) || px.startsWith(`${py} `);
      if (!igual) continue;
      const corta = x.length <= y.length ? x : y;
      if (!comunes.some((c) => plano(c) === plano(corta))) comunes.push(corta);
    }
  }
  return comunes;
}

function generoCompatible(a, b) {
  return a.genero === b.genero || a.genero === 'unisex' || b.genero === 'unisex';
}

/**
 * Los `n` aromas mas parecidos: [{ producto, comparte: [notas], familia }].
 * `familia` es el adjetivo corto ("amaderado") cuando no comparten notas.
 */
export function parecidos(producto, todos, n = 3) {
  if (!producto) return [];
  const familia = familiaDe(producto);
  return (todos || [])
    .filter((p) => p.id !== producto.id && p.activo && esPublicable(p) && generoCompatible(p, producto))
    .map((p) => {
      const comparte = notasEnComun(producto, p);
      const misma = familia !== 'otros' && familiaDe(p) === familia;
      return { producto: p, comparte, misma };
    })
    .sort((a, b) =>
      (b.misma - a.misma)
      || (b.comparte.length - a.comparte.length)
      || ((b.producto.destacado ? 1 : 0) - (a.producto.destacado ? 1 : 0))
      || ((a.producto.orden ?? 9999) - (b.producto.orden ?? 9999)))
    .slice(0, n)
    .map(({ producto: p, comparte, misma }) => ({
      producto: p,
      comparte: comparte.slice(0, 2),
      familia: misma ? familiaPorId(familia).corto : null,
    }));
}
