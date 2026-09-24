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
const CatalogoScreen = lazy(() => import('./components/tienda/CatalogoScreen'));

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
            <Suspense fallback={null}>
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
