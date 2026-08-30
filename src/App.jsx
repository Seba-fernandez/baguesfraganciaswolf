import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGate from './components/auth/AuthGate';
import Layout from './components/layout/Layout';
import PedidosScreen from './components/panel/PedidosScreen';
import ProductosScreen from './components/panel/ProductosScreen';
import ClientesScreen from './components/panel/ClientesScreen';
import AjustesScreen from './components/panel/AjustesScreen';

// AuthGate envuelve TODO: mientras resuelve la sesión muestra un loader, así
// ninguna ruta redirige antes de que Supabase procese el retorno de Google
// (el ?code=... del OAuth). La tienda pública (/) llega en la Fase 2.
export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route path="/panel" element={<Layout title="Pedidos"><PedidosScreen /></Layout>} />
        <Route path="/panel/productos" element={<Layout title="Catálogo"><ProductosScreen /></Layout>} />
        <Route path="/panel/clientes" element={<Layout title="Clientes"><ClientesScreen /></Layout>} />
        <Route path="/panel/ajustes" element={<Layout title="Ajustes"><AjustesScreen /></Layout>} />
        <Route path="*" element={<Navigate to="/panel" replace />} />
      </Routes>
    </AuthGate>
  );
}
