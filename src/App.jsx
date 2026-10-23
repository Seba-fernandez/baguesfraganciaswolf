import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import TiendaShell from './components/tienda/TiendaShell';
import HomeScreen from './components/tienda/HomeScreen';

// La tienda va en la entrada, SIN lazy. Antes la portada encadenaba tres viajes
// de red —index.js, después TiendaShell, después HomeScreen— y recién ahí
// dibujaba: cada lazy en el camino crítico es una espera en serie, no un ahorro.
// El código que ahorraban eran unos pocos kB; la espera costaba cientos de ms.
//
// El catálogo sí es lazy: es otra página, se llega con un clic y para entonces
// ya está el resto.
//
// Pero se puede precargar. Cuando se entra directo a /catalogo, el HTML ya trae
// la cáscara del catálogo (scripts/prerender.mjs) y main.jsx espera este chunk
// antes de montar: si React arrancara sin él, el primer dibujado sería el
// fallback vacío y el pie con el aviso legal subiría hasta arriba de la
// pantalla. Con el módulo ya en memoria, el lazy lo entrega en el mismo render
// (un `then` que contesta en el acto, que React resuelve sin suspender). El
// render del build usa lo mismo para dibujar la cáscara.
import { precargarCatalogo, moduloCatalogo } from './components/tienda/precargaCatalogo.js';
export { precargarCatalogo };
const CatalogoScreen = lazy(() =>
  moduloCatalogo() ? { then: (listo) => listo(moduloCatalogo()) } : precargarCatalogo()
);

// Si aun asi el catalogo tarda (red muy lenta), se ve una pagina de papel del
// alto de la pantalla, no la portada vaciada con el pie arriba.
const EsperaCatalogo = () => (
  <section className="dia" style={{ minHeight: '100dvh' }} aria-busy="true" />
);

// El panel entero en un chunk aparte (contextos, sesión, base de datos,
// global.css). La tienda nunca lo descarga. Ver components/panel/PanelApp.jsx.
const PanelApp = lazy(() => import('./components/panel/PanelApp'));

const Loader = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: '#bcad98' }}>
    Cargando…
  </div>
);

// "/" y "/catalogo" son la tienda pública (sin login), bajo una cáscara común.
// "/panel/*" es el admin, que se monta con todo lo suyo adentro de PanelApp.
export default function App() {
  return (
    <Routes>
      <Route element={<TiendaShell />}>
        <Route path="/" element={<HomeScreen />} />
        <Route
          path="/catalogo"
          element={
            <Suspense fallback={<EsperaCatalogo />}>
              <CatalogoScreen />
            </Suspense>
          }
        />
      </Route>

      <Route
        path="/panel/*"
        element={
          <Suspense fallback={<Loader />}>
            <PanelApp />
          </Suspense>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
