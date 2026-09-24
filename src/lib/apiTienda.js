/**
 * Cliente de la tienda publica, con fetch pelado.
 *
 * Por que no usa @supabase/supabase-js: ese paquete trae auth, realtime,
 * storage y postgrest. La tienda no escribe en tablas, no tiene sesion y no
 * escucha nada: solo LEE dos tablas y llama una funcion. Medido, el cliente
 * completo se llevaba ~45 kB comprimidos del chunk inicial, que una visitante
 * anonima descargaba antes de que se dibujara el primer perfume.
 *
 * PostgREST (que es lo que Supabase expone en /rest/v1) se habla con fetch y
 * dos headers. Eso es todo lo que hay aca.
 *
 * La clave anonima es publica por definicion: es la misma que viaja en el
 * bundle con supabase-js. Lo que protege los datos son las politicas de fila
 * (RLS), no esconder la clave. Ver docs/ARQUITECTURA.md.
 */

const URL_BASE = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;

const cabeceras = {
  apikey: CLAVE,
  Authorization: `Bearer ${CLAVE}`,
};

async function pedir(ruta, opciones = {}) {
  if (!URL_BASE || !CLAVE) {
    throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  }
  const r = await fetch(`${URL_BASE}/rest/v1/${ruta}`, {
    ...opciones,
    headers: { ...cabeceras, ...(opciones.headers || {}) },
  });
  if (!r.ok) {
    const detalle = await r.text().catch(() => '');
    throw new Error(`${r.status} ${r.statusText} ${detalle}`.trim());
  }
  // Las respuestas sin cuerpo (204) no se pueden parsear.
  if (r.status === 204) return null;
  return r.json();
}

/** El catalogo entero, en el mismo orden que usaba el cliente anterior. */
export function traerProductos() {
  return pedir('products?select=*&order=orden.asc,created_at.asc');
}

/** La fila unica de configuracion. Devuelve null si todavia no existe. */
export async function traerAjustes() {
  const filas = await pedir('settings?select=*&id=eq.1&limit=1');
  return Array.isArray(filas) ? filas[0] || null : filas;
}

/**
 * El unico camino de escritura de la tienda: la funcion crear_pedido_web()
 * (SECURITY DEFINER), que valida el nombre, normaliza el telefono y busca los
 * precios del lado del servidor. Lo que manda el navegador no se confia.
 */
export async function crearPedidoWeb({ nombre, telefono, items }) {
  const datos = await pedir('rpc/crear_pedido_web', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_nombre: nombre,
      p_telefono: telefono,
      p_items: items.map((it) => ({
        product_id: it.productId,
        ml: it.ml,
        cantidad: it.cantidad,
      })),
    }),
  });
  return Array.isArray(datos) ? datos[0] : datos;
}
