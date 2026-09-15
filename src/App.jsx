import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGate from './components/auth/AuthGate';
import Layout from './components/layout/Layout';

// Cada mitad de la app carga su propio peso: el panel no necesita three/gsap
// (tienda) y la tienda no necesita cargar todas las pantallas del panel.
const PedidosScreen = lazy(() => import('./components/panel/PedidosScreen'));
const ProductosScreen = lazy(() => import('./components/panel/ProductosScreen'));
const ClientesScreen = lazy(() => import('./components/panel/ClientesScreen'));
const AjustesScreen = lazy(() => import('./components/panel/AjustesScreen'));
// La tienda pública: una cáscara con datos + carrito, y adentro las dos
// páginas (inicio y catálogo).
const TiendaShell = lazy(() => import('./components/tienda/TiendaShell'));
const HomeScreen = lazy(() => import('./components/tienda/HomeScreen'));
const CatalogoScreen = lazy(() => import('./components/tienda/CatalogoScreen'));

const Loader = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: 'var(--text-tertiary, #888)' }}>
    Cargando…
  </div>
);

// "/" y "/catalogo" son la tienda pública (sin login), bajo una cáscara común.
// "/panel/*" es el admin, protegido por un único AuthGate que envuelve todo ese
// subárbol — así ninguna ruta redirige antes de que Supabase procese el retorno
// de Google (?code=... del OAuth).
export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route element={<TiendaShell />}>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/catalogo" element={<CatalogoScreen />} />
        </Route>

        <Route
          path="/panel/*"
          element={
            <AuthGate>
              <Routes>
                <Route index element={<Layout title="Pedidos"><PedidosScreen /></Layout>} />
                <Route path="productos" element={<Layout title="Catálogo"><ProductosScreen /></Layout>} />
                <Route path="clientes" element={<Layout title="Clientes"><ClientesScreen /></Layout>} />
                <Route path="ajustes" element={<Layout title="Ajustes"><AjustesScreen /></Layout>} />
                <Route path="*" element={<Navigate to="/panel" replace />} />
              </Routes>
            </AuthGate>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
