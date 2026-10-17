// ============================================================================
// familias.js — de la familia olfativa de la base (texto libre) a cinco
// familias que se entienden sin saber de perfumeria.
//
// La base trae cosas como "Floral oriental", "Aromatica fougere" o "Amaderada
// ambarada gourmand": 47 combinaciones para 101 aromas. Para elegir algo nuevo
// "por lo que te gusta oler" hacen falta pocas puertas. Se usa la rueda de
// Michael Edwards, simplificada:
//
//   Frescos y citricos  aromatica, fougere, acuatica, citrica, fresca
//   Florales            floral, floriental (y frutal o almizcle con floral)
//   Dulces y gourmand   "gourmand" en la familia, o notas golosas (ver abajo)
//   Amaderados          amaderada, chipre
//   Ambar y especiados  oriental, ambar, ambarada, especiada
//
// La primera palabra que se reconoce manda ("Floral oriental" es floral con
// fondo oriental; "Oriental floral", al reves). Lo que no tiene familia cargada
// va a "Otros": no se adivina.
//
// Dulces: con solo la palabra "gourmand" quedaban 3 aromas y el filtro no
// servia. Entra tambien el que tiene al menos una nota golosa fuerte (cafe,
// caramelo, pralin, cacao, miel...) y en total dos o mas golosas (sumando
// vainilla, haba tonka, benjui): La Vie Est Belle, Black Opium, Good Girl. La
// vainilla o la tonka solas no alcanzan: estan en medio catalogo, tambien en
// amaderados como Oud Wood.
//
// Funcion pura. La usan el filtro del catalogo y "Si te gusta este" (A7).
// ============================================================================

export const FAMILIAS = [
  { id: 'frescos', nombre: 'Frescos y cítricos', corto: 'fresco' },
  { id: 'florales', nombre: 'Florales', corto: 'floral' },
  { id: 'dulces', nombre: 'Dulces y gourmand', corto: 'dulce' },
  { id: 'amaderados', nombre: 'Amaderados', corto: 'amaderado' },
  { id: 'ambar', nombre: 'Ámbar y especiados', corto: 'ambarado' },
];
export const OTROS = { id: 'otros', nombre: 'Otros', corto: '' };

const PALABRA = {
  aromatica: 'frescos', fougere: 'frescos', acuatica: 'frescos', citrica: 'frescos', fresca: 'frescos',
  floral: 'florales', floriental: 'florales',
  amaderada: 'amaderados', amaderado: 'amaderados', chipre: 'amaderados',
  oriental: 'ambar', ambar: 'ambar', ambarada: 'ambar', ambarado: 'ambar', especiada: 'ambar',
};

const GOLOSAS_FUERTES = ['cafe', 'caramelo', 'pralin', 'cacao', 'chocolate', 'miel', 'merengue',
  'azucar', 'palomitas', 'coco', 'almendra', 'regaliz', 'licor', 'avellana', 'macadamia'];
const GOLOSAS_SUAVES = ['vainilla', 'haba tonka', 'tonka', 'benjui'];

const plano = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');

function notasDe(producto) {
  return [producto?.nota_salida, producto?.nota_corazon, producto?.nota_fondo]
    .flatMap((t) => plano(t).split(','))
    .map((n) => n.trim())
    .filter(Boolean);
}

function esGolosa(producto) {
  const notas = notasDe(producto);
  const fuertes = notas.filter((n) => GOLOSAS_FUERTES.some((g) => n.includes(g))).length;
  const suaves = notas.filter((n) => GOLOSAS_SUAVES.some((g) => n.includes(g))).length;
  return fuertes >= 1 && fuertes + suaves >= 2;
}

/** Id de la familia grande del aroma: 'frescos', 'florales'... u 'otros'. */
export function familiaDe(producto) {
  const texto = plano(producto?.familia_olfativa);
  if (!texto) return OTROS.id;
  if (texto.includes('gourmand') || esGolosa(producto)) return 'dulces';
  for (const palabra of texto.split(/[^a-z]+/)) {
    if (PALABRA[palabra]) return PALABRA[palabra];
  }
  return OTROS.id;
}

/** La familia completa ({ id, nombre, corto }) a partir del id. */
export function familiaPorId(id) {
  return FAMILIAS.find((f) => f.id === id) || OTROS;
}
