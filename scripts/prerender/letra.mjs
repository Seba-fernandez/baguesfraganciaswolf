// La letra del titulo, adentro del HTML (Sebas, 23/10: "la letra cambia").
//
// "Cada perfume," usa Boska recta, que llegaba ultima (en
// fuentes-diferidas.css, despues de cargar la pagina): el titulo cambiaba de
// letra a la vista. Aca se recorta Boska recta a los caracteres del titulo (salen
// del marcado recien dibujado: si cambia el titulo, cambia el recorte solo) y
// viaja dentro del HTML como 'Boska Primera', 1,6 kB.
//
// Solo esta: se probo embeber las cinco letras del primer pantallazo y
// Lighthouse bajaba 3 puntos (cuenta cada letra embebida como un pedido mas).
import fs from 'node:fs';
import subsetFont from 'subset-font';
import { ErrorDePagina } from './html.mjs';

/** El texto de los <h1> del marcado, sin etiquetas. Funcion pura. */
export function textoDelTitulo(marcado) {
  const limpiar = (t) => t.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ');
  return [...marcado.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => limpiar(m[1])).join('');
}

/** Devuelve el <style> con la letra recortada, listo para el <head>. */
export async function estiloDeLetra(marcado, archivoFuente) {
  const titulo = textoDelTitulo(marcado);
  if (!titulo.trim()) throw new ErrorDePagina('no se encontro el titulo en el marcado para recortar su letra');
  const recorte = await subsetFont(fs.readFileSync(archivoFuente), titulo, { targetFormat: 'woff2' });
  const cara = `@font-face{font-family:'Boska Primera';font-style:normal;font-weight:451 800;font-display:swap;src:url(data:font/woff2;base64,${recorte.toString('base64')}) format('woff2')}`;
  return { estilo: `<style>${cara}</style>`, peso: recorte.length };
}
