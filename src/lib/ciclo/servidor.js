// servidor.js — lo que la pantalla "Cargar ciclo" le pide al navegador y a la base.
//
// Solo lo usa el panel (importa lib/supabase: no puede entrar en la tienda).
//   leerArchivo     PDF -> paginas -> linea -> perfumes leidos
//   buscarCaja      busca la caja en bagues.com.ar (funcion "tiendas")
//   imagenDeTienda  baja la foto por la misma funcion (el navegador no puede directo)
//   subirFoto       guarda la foto armada en Storage y la pone en el perfume
//   ponerFoto       pone una foto ya subida (desde el celular) en el perfume
//   aplicarCiclo    registra la carga y llama a aplicar_ciclo()
import { supabase } from '../supabase';
import { leerPdf } from './pdf.js';
import { leerUnlock } from './leerUnlock.js';
import { leerBagues } from './leerBagues.js';
import { lineaDePaginas } from './panel.js';
import { cicloDelPdf } from './comparar.js';

export const TAMANO_MAXIMO_PDF = 60 * 1024 * 1024;

let pdfjsCargado = null;
/** pdf.js (version "legacy", la que anda tambien en Safari viejos) recien cuando hace falta. */
function cargarPdfjs() {
  if (!pdfjsCargado) {
    pdfjsCargado = Promise.all([
      import('pdfjs-dist/legacy/build/pdf.mjs'),
      import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
    ]).then(([pdfjs, worker]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
      return pdfjs;
    }).catch((e) => {
      pdfjsCargado = null;
      throw e;
    });
  }
  return pdfjsCargado;
}

/**
 * Lee un PDF del ciclo. Devuelve
 *   { nombre, tamano, paginas: n, linea, leidos, ciclo, cuentas }
 * `linea` sale de los codigos que trae (no del nombre del archivo).
 */
export async function leerArchivo(archivo, alAvanzar) {
  if (!/\.pdf$/i.test(archivo.name) && archivo.type !== 'application/pdf') {
    throw new Error(`${archivo.name} no es un PDF.`);
  }
  if (archivo.size > TAMANO_MAXIMO_PDF) {
    throw new Error(`${archivo.name} pesa ${Math.round(archivo.size / 1048576)} MB; el tope es ${TAMANO_MAXIMO_PDF / 1048576} MB.`);
  }
  const pdfjs = await cargarPdfjs();
  const paginas = await leerPdf(pdfjs, await archivo.arrayBuffer(), { alAvanzar });
  const cuentas = lineaDePaginas(paginas);
  if (!cuentas.linea) throw new Error(`En ${archivo.name} no hay códigos de Bagués (1028...) ni de Unlock (2028...). ¿Es el catálogo del ciclo?`);
  const leidos = cuentas.linea === 'unlock' ? leerUnlock(paginas) : leerBagues(paginas);
  return {
    nombre: archivo.name,
    tamano: archivo.size,
    paginas: paginas.length,
    linea: cuentas.linea,
    leidos,
    ciclo: cicloDelPdf(paginas),
    cuentas: { unlock: cuentas.unlock, bagues: cuentas.bagues },
  };
}

async function token() {
  const { data } = await supabase.auth.getSession();
  const t = data?.session?.access_token;
  if (!t) throw new Error('Se cerró la sesión. Volvé a entrar al panel.');
  return t;
}

function urlFuncion(params) {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiendas?${new URLSearchParams(params)}`;
}

async function pedirFuncion(params) {
  const r = await fetch(urlFuncion(params), {
    headers: { Authorization: `Bearer ${await token()}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
  });
  if (!r.ok) {
    let motivo = `la función contestó ${r.status}`;
    try { motivo = (await r.json()).error || motivo; } catch { /* sin cuerpo */ }
    throw new Error(motivo);
  }
  return r;
}

/** [{ titulo, sku, descripcion, imagenes }] de la tienda de la linea. */
export async function buscarCaja(linea, q) {
  const r = await pedirFuncion({ accion: 'buscar', linea, q });
  return (await r.json()).resultados || [];
}

export async function imagenDeTienda(url) {
  const r = await pedirFuncion({ accion: 'imagen', url });
  return r.blob();
}

/** Sube la foto a Storage (bucket "productos") y la pone como foto del perfume. */
export async function subirFoto(producto, blob) {
  const ext = blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const ruta = `ciclo/${producto.slug || producto.id}-${Date.now().toString(36)}.${ext}`;
  const { error } = await supabase.storage.from('productos').upload(ruta, blob, { cacheControl: '31536000', upsert: false, contentType: blob.type });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  const { data } = supabase.storage.from('productos').getPublicUrl(ruta);
  const { error: e2 } = await supabase.from('products').update({ imagen_url: data.publicUrl }).eq('id', producto.id);
  if (e2) throw new Error(`La foto se subió pero no se pudo poner en el perfume: ${e2.message}`);
  return data.publicUrl;
}

/** Pone como foto del perfume una que ya esta subida (la de ImageUpload). */
export async function ponerFoto(producto, url) {
  const { error } = await supabase.from('products').update({ imagen_url: url }).eq('id', producto.id);
  if (error) throw new Error(`No se pudo poner la foto: ${error.message}`);
}

/**
 * Registra la carga (que se leyo y que se propuso) y aplica. Todo o nada: si
 * la base rechaza una operacion, no cambia ninguna y devuelve el motivo.
 */
export async function aplicarCiclo({ archivos, lectura, propuesta, operaciones, nuevos, ciclo }) {
  const { data: carga, error: e1 } = await supabase
    .from('ciclo_cargas')
    .insert({ archivos, lectura, propuesta })
    .select('id')
    .single();
  if (e1) throw new Error(`No se pudo registrar la carga: ${e1.message}`);
  const { data, error } = await supabase.rpc('aplicar_ciclo', {
    p_carga: carga.id,
    p_operaciones: operaciones,
    p_nuevos: nuevos,
    p_ciclo: ciclo,
  });
  if (error) throw new Error(`La base no aplicó nada: ${error.message}`);
  return data;
}
