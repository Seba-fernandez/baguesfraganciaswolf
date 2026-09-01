import { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AuthGate from './components/auth/AuthGate';
import Layout from './components/layout/Layout';
import { useAuth } from './contexts/AuthContext';

// Cada mitad de la app carga su propio peso: el panel no necesita three/gsap
// (tienda) y la tienda no necesita cargar todas las pantallas del panel.
const PedidosScreen = lazy(() => import('./components/panel/PedidosScreen'));
const ProductosScreen = lazy(() => import('./components/panel/ProductosScreen'));
const ClientesScreen = lazy(() => import('./components/panel/ClientesScreen'));
const AjustesScreen = lazy(() => import('./components/panel/AjustesScreen'));
const HomeScreen = lazy(() => import('./components/tienda/HomeScreen'));

const Loader = () => (
  <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', color: 'var(--text-tertiary, #888)' }}>
    Cargando…
  </div>
);

// El login con Google vuelve siempre a "/" (única URL en la allowlist de
// Supabase). Si esa vuelta trae un ?code= de OAuth, en cuanto la sesión
// resuelve mandamos al admin directo a /panel en vez de dejarlo en la tienda.
function useVolverAlPanelSiEsAdmin() {
  const [teniaCode] = useState(() => /[?&]code=/.test(window.location.search));
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (teniaCode && !loading && user && isAdmin && location.pathname === '/') {
      navigate('/panel', { replace: true });
    }
  }, [teniaCode, loading, user, isAdmin, location.pathname, navigate]);
}

function Home() {
  useVolverAlPanelSiEsAdmin();
  return <HomeScreen />;
}

// "/" es la tienda pública (sin login). "/panel/*" es el admin, protegido por
// un único AuthGate que envuelve todo ese subárbol — así ninguna ruta redirige
// antes de que Supabase procese el retorno de Google (?code=... del OAuth).
export default function App() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path="/" element={<Home />} />

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
