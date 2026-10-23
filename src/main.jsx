import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App, { precargarCatalogo } from './App.jsx'
import { escucharErrores } from './lib/errores.js'
import { cargarMetricas } from './lib/metricas.js'

// Los errores que le pasen a una clienta quedan anotados (ver lib/errores.js),
// y las visitas y la velocidad reales se miden despues de cargar (lib/metricas.js).
escucharErrores()
cargarMetricas()

// Ni ThemeProvider ni AuthProvider ni global.css viven acá: son del panel y se
// montan adentro de components/panel/PanelApp.jsx. El reset mínimo que necesita
// la tienda está embebido en index.html, para no pedir una hoja de estilos que
// bloquee el dibujado.

const raiz = document.getElementById('root')

const app = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// La portada se genera como HTML en el build (scripts/prerender.mjs), así que
// cuando hay marcado servido se hidrata sobre él en vez de volver a dibujarlo
// desde cero. En las rutas que no se pre-generan el div viene vacío y se monta
// normal.
// El HTML pre-generado es SIEMPRE el de la portada, y Vercel lo sirve también
// en /catalogo y /panel por la reescritura. Hidratar la portada sobre otra ruta
// es un desajuste garantizado: React lo detecta, tira errores en consola y
// redibuja todo igual. En cualquier ruta que no sea "/" se vacía y se monta.
//
// /catalogo tiene su propio HTML pre-generado (la cáscara con tarjetas de
// espera, ver scripts/prerender.mjs), marcado con data-ruta. Ese no se vacía:
// createRoot lo reemplaza recién en su primer commit, que dibuja lo mismo, así
// no hay un cuadro en blanco ni el pie subiendo hasta arriba.
const ruta = window.location.pathname.replace(/\/+$/, '') || '/'
const esPortada = ruta === '/'
const servida = raiz.dataset.ruta || '/'
if (!esPortada && raiz.hasChildNodes() && servida !== ruta) raiz.textContent = ''

if (esPortada && raiz.hasChildNodes()) {
  // La hidratación espera a que el navegador haya dibujado.
  //
  // El marcado ya está completo y es navegable sin JavaScript: los dos botones
  // del hero son enlaces de verdad. Hidratar es recorrer todo ese árbol y
  // enganchar el comportamiento, y eso compite por el hilo principal justo
  // contra el primer dibujado — medido, la escena del hero tenía la imagen lista
  // en 13 ms y tardaba medio segundo más en pintarse porque el hilo estaba
  // ocupado.
  //
  // requestIdleCallback la corre en el primer hueco libre; el timeout es el
  // techo, para que en un teléfono que nunca queda ocioso se hidrate igual.
  // Espera al evento `load` además del hueco libre. Hidratar dispara los dos
  // pedidos a la base, y esos compiten por el ancho de banda justo con la imagen
  // del hero, que es la que define el LCP. Después de `load` las imágenes de la
  // primera pantalla ya bajaron y no hay nada que quitarles.
  const hidratar = () => {
    if ('requestIdleCallback' in window) requestIdleCallback(() => hydrateRoot(raiz, app), { timeout: 800 })
    else setTimeout(() => hydrateRoot(raiz, app), 1)
  }
  if (document.readyState === 'complete') hidratar()
  else window.addEventListener('load', hidratar, { once: true })
} else if (ruta === '/catalogo') {
  // El chunk del catálogo antes de montar: así el primer dibujado es la misma
  // cáscara que ya está en pantalla y no el fallback vacío (ver App.jsx).
  const montar = () => createRoot(raiz).render(app)
  precargarCatalogo().then(montar, montar)
} else {
  createRoot(raiz).render(app)
}
