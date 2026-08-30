import { Routes, Route, Navigate } from 'react-router-dom';
import AuthGate from './components/auth/AuthGate';
import Layout from './components/layout/Layout';
import PedidosScreen from './components/panel/PedidosScreen';
import ProductosScreen from './components/panel/ProductosScreen';
import ClientesScreen from './components/panel/ClientesScreen';
import AjustesScreen from './components/panel/AjustesScreen';

// La tienda pública (/) llega en la Fase 2. Por ahora todo entra al panel.
export default function App() {
  return (
    <Routes>
      <Route
        path="/panel"
        element={
          <AuthGate>
            <Layout title="Pedidos"><PedidosScreen /></Layout>
          </AuthGate>
        }
      />
      <Route
        path="/panel/productos"
        element={
          <AuthGate>
            <Layout title="Catálogo"><ProductosScreen /></Layout>
          </AuthGate>
        }
      />
      <Route
        path="/panel/clientes"
        element={
          <AuthGate>
            <Layout title="Clientes"><ClientesScreen /></Layout>
          </AuthGate>
        }
      />
      <Route
        path="/panel/ajustes"
        element={
          <AuthGate>
            <Layout title="Ajustes"><AjustesScreen /></Layout>
          </AuthGate>
        }
      />
      <Route path="*" element={<Navigate to="/panel" replace />} />
    </Routes>
  );
}
