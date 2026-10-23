// ============================================================================
// metricas.js: visitas y velocidad medidas en los telefonos de verdad
//
// Lighthouse simula un telefono; esto mide los reales. Carga los dos scripts
// de Vercel (Web Analytics: visitas, paginas, de donde llegan; Speed
// Insights: cuanto tarda en verse y en responder en cada telefono) sin
// paquetes de npm: son dos archivos que Vercel sirve desde el mismo dominio
// (/_vercel/...), asi que la politica de seguridad no cambia.
//
// Se cargan despues de que la pagina termino de cargar y en un rato libre: no
// le quitan nada a la primera pantalla. Antes de agregar cada script se
// pregunta si existe: hasta que Sebas los active en el panel de Vercel
// (Analytics y Speed Insights, un boton cada uno) no se carga nada y no hay
// errores en consola.
// ============================================================================

const SCRIPTS = ['/_vercel/insights/script.js', '/_vercel/speed-insights/script.js'];

async function cargar(src) {
  try {
    const r = await fetch(src, { method: 'HEAD' });
    if (!r.ok || !/javascript/.test(r.headers.get('content-type') || '')) return;
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    document.head.appendChild(s);
  } catch {
    /* sin metricas no pasa nada */
  }
}

export function cargarMetricas() {
  if (typeof window === 'undefined' || /^(localhost|127\.)/.test(location.hostname)) return;
  // Las colas que esperan los scripts de Vercel.
  window.va = window.va || function va() { (window.vaq = window.vaq || []).push(arguments); };
  window.si = window.si || function si() { (window.siq = window.siq || []).push(arguments); };
  const empezar = () => {
    const ir = () => SCRIPTS.forEach(cargar);
    if ('requestIdleCallback' in window) requestIdleCallback(ir, { timeout: 4000 });
    else setTimeout(ir, 2000);
  };
  if (document.readyState === 'complete') empezar();
  else addEventListener('load', empezar, { once: true });
}
