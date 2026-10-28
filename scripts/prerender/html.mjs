// Herramientas chicas para tocar el HTML del build sin sorpresas.
//
// Todo lo que el prerender cambia en una pagina pasa por aca. La regla: cada
// cambio tiene que encontrar exactamente lo que busca. Si no lo encuentra (o
// lo encuentra dos veces), el build se frena con un mensaje claro, en vez de
// publicar una pagina a medias.
//
// Los reemplazos van siempre con funcion: un texto como "$&#160;16.499" (el
// precio escapado) tiene "$&", que String.replace lee como "pega lo
// encontrado". Paso el 23/10.

/** Error del prerender: el build lo muestra y termina con codigo 1. */
export class ErrorDePagina extends Error {}

/**
 * Reemplaza `buscado` (texto o expresion) exactamente una vez.
 * `que` describe el cambio para el mensaje de error.
 */
export function reemplazarUna(html, buscado, nuevo, que) {
  const veces = typeof buscado === 'string'
    ? html.split(buscado).length - 1
    : (html.match(new RegExp(buscado.source, buscado.flags.includes('g') ? buscado.flags : `${buscado.flags}g`)) || []).length;
  if (veces !== 1) {
    throw new ErrorDePagina(`${que}: se esperaba encontrarlo una vez y aparece ${veces}`);
  }
  return html.replace(buscado, () => nuevo);
}

/** Agrega algo justo antes de </head>. */
export function antesDeCerrarHead(html, agregado, que) {
  return reemplazarUna(html, '</head>', `${agregado}\n  </head>`, que);
}

/** Saca las precargas cuyo href empiece con alguno de los prefijos (ej. '/hero/'). */
export function sacarPrecargas(html, prefijos) {
  const grupo = prefijos.map((p) => p.replace(/[/.]/g, '\\$&')).join('|');
  return html.replace(new RegExp(`\\n\\s*<link rel="preload" href="(?:${grupo})[^>]*>`, 'g'), '');
}

/** Cambia el <title>. */
export function cambiarTitulo(html, titulo) {
  return reemplazarUna(html, /<title>[^<]*<\/title>/, `<title>${titulo}</title>`, 'el <title>');
}

/** Escapa un texto para ponerlo dentro de un atributo HTML. */
export function paraAtributo(texto) {
  return String(texto)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/\u00a0/g, '&#160;');
}

/** Tamaño legible para los mensajes del build. */
export const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
