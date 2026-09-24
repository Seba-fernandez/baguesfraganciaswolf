import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
// En React Router 7 ya no existe el subcamino /server: StaticRouter se exporta
// desde el paquete principal.
import { StaticRouter } from 'react-router-dom';
import App from './App.jsx';

/**
 * Entrada de servidor: existe solo para el build.
 *
 * La tienda es una sola página que dibuja el navegador, así que hasta ahora el
 * HTML que llegaba era un <div id="root"> vacío: no aparecía NADA hasta que el
 * bundle terminaba de bajar, parsear y ejecutar. En un teléfono de gama media
 * con 4G eso son segundos en los que la pantalla está en blanco.
 *
 * Acá la portada se dibuja una vez durante el build (scripts/prerender.mjs) y
 * se guarda ya armada en el HTML. El navegador la pinta apenas la recibe, y
 * cuando el JavaScript llega se hidrata encima: los mismos nodos, ahora con
 * comportamiento. El texto, la escena y el frasco son los mismos en las dos
 * pasadas, así que no hay nada que redibujar.
 *
 * Lo que depende de la base (el catálogo, los destacados, las promos) sale
 * vacío del build y se completa al hidratar, que es exactamente el estado
 * inicial que tiene el cliente en su primer dibujado: por eso coinciden.
 */
export function render(url = '/') {
  return renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>
  );
}
