import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'

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
if (raiz.hasChildNodes()) {
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
} else {
  createRoot(raiz).render(app)
}
