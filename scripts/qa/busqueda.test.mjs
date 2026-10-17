// Pruebas del buscador (src/lib/busqueda.js). Sin framework:
//   node scripts/qa/busqueda.test.mjs
// Los aromas de abajo copian la forma real de la tabla products (ciclo 10/26).
import assert from 'node:assert/strict';
import { buscarAromas, normalizar, raiz } from '../../src/lib/busqueda.js';

const pres = (ml, linea, caja, activo = true) => ({ ml, linea, nombre_proveedor: caja, codigo: '1028', precio: 1, activo });

const CATALOGO = [
  { id: 1, inspirado_en: 'Sauvage', nombre: 'Sauvage', genero: 'masculino', familia_olfativa: 'Aromática fougère',
    nota_salida: 'Bergamota de Reggio', nota_corazon: 'Pimienta de Sichuan', nota_fondo: 'Ambroxan',
    presentaciones: [pres(100, 'unlock', 'Sauvage'), pres(50, 'bagues', 'Arizona')] },
  { id: 2, inspirado_en: 'Good Girl', nombre: 'Good Girl', genero: 'femenino', familia_olfativa: 'Floral oriental',
    nota_salida: 'Almendra, café', nota_corazon: 'Nardo, jazmín', nota_fondo: 'Haba tonka, cacao, vainilla',
    presentaciones: [pres(80, 'unlock', 'Good Girl')] },
  { id: 3, inspirado_en: 'Invictus', nombre: 'Invictus', genero: 'masculino', familia_olfativa: 'Amaderada acuática',
    nota_salida: 'Pomelo', nota_corazon: 'Laurel', nota_fondo: 'Guayaco, ámbar gris',
    presentaciones: [pres(50, 'bagues', 'Esparta')] },
  { id: 4, inspirado_en: '212 VIP Rosé', nombre: '212 VIP Rosé', genero: 'femenino', familia_olfativa: 'Floral frutal',
    nota_salida: 'Champagne rosé', nota_corazon: 'Flor de durazno', nota_fondo: 'Almizcle',
    presentaciones: [pres(50, 'bagues', 'Manhattan')] },
  { id: 5, inspirado_en: 'Tom Ford Oud Wood', nombre: 'Oud Wood', genero: 'unisex', familia_olfativa: 'Amaderada especiada',
    nota_salida: 'Cardamomo', nota_corazon: 'Oud, sándalo', nota_fondo: 'Vainilla, ámbar',
    presentaciones: [pres(100, 'unlock', 'Oud Wood')] },
  { id: 6, inspirado_en: 'Libre', nombre: 'Libre', genero: 'femenino', familia_olfativa: 'Floral',
    nota_salida: 'Lavanda', nota_corazon: 'Flor de azahar', nota_fondo: 'Vainilla de Madagascar',
    presentaciones: [pres(50, 'bagues', 'Granada'), pres(30, 'bagues', 'Vieja caja', false)] },
];

const ids = (q) => buscarAromas(CATALOGO, q).map((p) => p.id).sort((a, b) => a - b);
let n = 0;
function caso(q, esperado) {
  assert.deepEqual(ids(q), esperado, `"${q}" devolvio ${JSON.stringify(ids(q))}, se esperaba ${JSON.stringify(esperado)}`);
  n++;
}

// Normalizacion
assert.equal(normalizar('Ámbar  GRIS—x'), 'ambar gris x');
assert.equal(raiz('amaderado'), 'amaderad');
assert.equal(raiz('amaderada'), 'amaderad');
assert.equal(raiz('flores'), 'flor');
assert.equal(raiz('212'), '212');

// Los terminos que pide el banco de pruebas (UX-3)
caso('sauvage', [1]);
caso('savage', [1]);                 // una letra de menos
caso('good gril', [2]);              // dos letras vecinas al reves
caso('amaderado', [3, 5]);           // la familia dice "amaderada"
caso('amaderada', [3, 5]);
caso('vainilla', [2, 5, 6]);         // en las notas
caso('hombre', [1, 3, 5]);           // el unisex tambien
caso('mujer', [2, 4, 5, 6]);
caso('arizona', [1]);                // nombre de la caja Bagues
caso('esparta', [3]);
caso('212 vip', [4]);

// Y el resto del comportamiento
caso('', [1, 2, 3, 4, 5, 6]);        // sin busqueda, todo
caso('Sauvage hombre', [1]);         // todas las palabras tienen que coincidir
caso('sauvage mujer', []);
caso('perfume de mujer', [2, 4, 5, 6]); // las palabras vacias no cuentan
caso('él', [1, 3, 5]);
caso('amad', [3, 5]);                // mientras se escribe
caso('VAINÍLLA', [2, 5, 6]);         // mayusculas y tildes
caso('vieja caja', []);              // un tamaño inactivo no se indexa
caso('zzzz perfume inexistente', []);
caso('rosa', []);                    // 4 letras: sin tolerancia salvo transposicion
caso('gril', [2]);                   // la transposicion sola tambien encuentra
caso('rsoa', []);                    // pero en 4 letras no hay otra tolerancia

console.log(`busqueda: ${n} casos OK`);
