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
  const hidratar = () => hydrateRoot(raiz, app)
  if ('requestIdleCallback' in window) {
    requestIdleCallback(hidratar, { timeout: 1200 })
  } else {
    setTimeout(hidratar, 1)
  }
} else {
  createRoot(raiz).render(app)
}
