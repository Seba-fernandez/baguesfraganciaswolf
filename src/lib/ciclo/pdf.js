// pdf.js — del PDF del ciclo a una lista de textos con su posicion.
//
// Los catalogos de Bagues y Unlock son PDF armados para imprimir: el texto no
// viene en orden de lectura, viene en el orden en que el diseñador lo dibujo.
// Por eso no alcanza con "sacar el texto": cada pedazo guarda en que pagina
// esta y en que lugar (x desde la izquierda, y desde arriba), y los lectores
// de cada linea (leerUnlock.js, leerBagues.js) arman los productos por
// cercania.
//
// Recibe la biblioteca pdf.js ya cargada (en el panel, la version para
// navegador; en las pruebas, la de Node), asi este archivo no depende de
// ninguna y se puede probar sin navegador.

/** Tope de paginas: un catalogo de Bagues tiene ~100. Mas es otro archivo. */
export const PAGINAS_MAXIMAS = 160;

/**
 * Lee el PDF y devuelve [{ n, ancho, alto, items: [{ x, y, s }] }].
 * `datos` es un ArrayBuffer o Uint8Array con el archivo.
 * `alAvanzar(n, total)` se llama despues de cada pagina (para la barra).
 */
export async function leerPdf(pdfjs, datos, { alAvanzar } = {}) {
  const doc = await pdfjs.getDocument({
    // Copia siempre: pdf.js rechaza el Buffer de Node y se queda con el arreglo.
    data: new Uint8Array(datos),
    isEvalSupported: false,
    disableFontFace: true,
  }).promise;
  if (doc.numPages > PAGINAS_MAXIMAS) {
    throw new Error(`El PDF tiene ${doc.numPages} páginas; un catálogo tiene menos de ${PAGINAS_MAXIMAS}.`);
  }
  const paginas = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pagina = await doc.getPage(n);
    const { width: ancho, height: alto } = pagina.getViewport({ scale: 1 });
    const { items } = await pagina.getTextContent();
    paginas.push({
      n,
      ancho: Math.round(ancho),
      alto: Math.round(alto),
      items: items
        .filter((it) => it.str && it.str.trim())
        .map((it) => ({ x: Math.round(it.transform[4]), y: Math.round(alto - it.transform[5]), s: it.str })),
    });
    pagina.cleanup();
    alAvanzar?.(n, doc.numPages);
  }
  await doc.destroy();
  return paginas;
}

/** El texto entero de una pagina, en el orden del archivo (para buscar frases). */
export function textoDePagina(pagina) {
  return pagina.items.map((i) => i.s).join(' ').replace(/\s+/g, ' ');
}

/** "$51.599" o "$ 53.699" -> 51599. null si no es un precio. */
export function precioDeTexto(s) {
  const m = String(s).match(/\$\s?(\d{1,3}(?:\.\d{3})+|\d{3,6})(?!\d)/);
  return m ? Number(m[1].replace(/\./g, '')) : null;
}
