// ============================================================================
// errores.js: anota en la base los errores que le pasan a una clienta
//
// Antes, si a alguien se le rompia algo en el telefono (un error de
// JavaScript, el pedido que no se pudo guardar), nadie se enteraba. Ahora se
// manda a registrar_error_web() (migracion 0013) y Sebas lo ve en el panel,
// en Ajustes > Errores de la tienda.
//
// Reglas:
//  - Solo el mensaje tecnico, la pagina, el navegador y la version. Nunca el
//    nombre ni el telefono de la clienta.
//  - Como mucho 5 avisos por visita y sin repetir el mismo mensaje: un error
//    en bucle no satura nada (la base ademas tiene su propio tope).
//  - Se ignora lo que no es de la tienda: extensiones del navegador, scripts
//    de otros sitios ("Script error.") y avisos conocidos sin efecto.
//  - Nunca rompe nada: si el aviso falla, se descarta en silencio.
// ============================================================================

const URL_BASE = import.meta.env.VITE_SUPABASE_URL;
const CLAVE = import.meta.env.VITE_SUPABASE_ANON_KEY;
// La version del codigo publicado (los 7 primeros caracteres del commit, que
// Vercel pasa al build). En local dice "local".
const VERSION = typeof __VERSION__ !== 'undefined' ? __VERSION__ : 'local';

const MAXIMO = 5;
const vistos = new Set();
let enviados = 0;

const IGNORAR = [
  /^Script error\.?$/i,
  /ResizeObserver loop/i,
  /extension:\/\//i,
  /chrome-extension|moz-extension|safari-extension/i,
  /Load failed$/i, // Safari al cortar una descarga cuando la persona se va
];

/** Manda un error. tipo: 'js', 'promesa', 'pedido', 'red'. */
export function registrarError(tipo, mensaje, donde = '') {
  try {
    if (!URL_BASE || !CLAVE || typeof window === 'undefined') return;
    // Por las dudas, ningun numero largo (un telefono) viaja en el mensaje.
    const texto = String(mensaje || '').replace(/\d{7,}/g, '…').slice(0, 500);
    if (!texto || IGNORAR.some((r) => r.test(texto) || r.test(donde))) return;
    const clave = `${tipo}|${texto}`;
    if (vistos.has(clave) || enviados >= MAXIMO) return;
    vistos.add(clave);
    enviados += 1;
    const cuerpo = JSON.stringify({
      p: {
        tipo,
        mensaje: texto,
        donde: String(donde || '').slice(0, 300),
        ruta: location.pathname + location.search.replace(/([?&])(nombre|tel[^=]*)=[^&]*/gi, '$1$2=…'),
        navegador: navigator.userAgent.slice(0, 200),
        version: VERSION,
      },
    });
    fetch(`${URL_BASE}/rest/v1/rpc/registrar_error_web`, {
      method: 'POST',
      keepalive: true,
      headers: { apikey: CLAVE, Authorization: `Bearer ${CLAVE}`, 'Content-Type': 'application/json' },
      body: cuerpo,
    }).catch(() => {});
  } catch {
    /* el aviso nunca puede romper la pagina */
  }
}

/** Escucha los errores que nadie atrapo. Se llama una vez al arrancar. */
export function escucharErrores() {
  if (typeof window === 'undefined') return;
  addEventListener('error', (e) => {
    // Solo los de la tienda: un archivo de otro dominio llega sin datos.
    if (e.filename && !e.filename.startsWith(location.origin)) return;
    const donde = e.filename ? `${e.filename.replace(location.origin, '')}:${e.lineno}:${e.colno}` : '';
    registrarError('js', e.message, donde);
  });
  addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    registrarError('promesa', r?.message || String(r), (r?.stack || '').split('\n')[1]?.trim() || '');
  });
}
