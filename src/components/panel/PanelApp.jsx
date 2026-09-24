import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import AuthGate from '../auth/AuthGate';
import Layout from '../layout/Layout';
import '../../styles/global.css';

/**
 * El panel entero, en un solo chunk que la tienda pública nunca descarga.
 *
 * Todo lo que antes vivía en main.jsx y en App.jsx —los dos contextos, el
 * portero de sesión, la estructura del panel y global.css— pasó acá adentro.
 * La razón es de peso: ese árbol arrastra @supabase/supabase-js (auth, realtime
 * y storage), la librería de movimiento del fondo animado, y un global.css cuya
 * primera línea es un @import a Google Fonts con tres familias.
 *
 * Nada de eso lo necesita alguien que entra a mirar perfumes, y sin embargo lo
 * descargaba antes de ver el primero. Acá el costo lo paga quien entra al
 * panel, que es una sola persona y con sesión.
 *
 * Las pantallas siguen siendo lazy entre sí: abrir Pedidos no baja Clientes.
 * El Suspense que las cubre es el de App.jsx.
 */
const PedidosScreen = lazy(() => import('./PedidosScreen'));
const ProductosScreen = lazy(() => import('./ProductosScreen'));
const ClientesScreen = lazy(() => import('./ClientesScreen'));
const AjustesScreen = lazy(() => import('./AjustesScreen'));

export default function PanelApp() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <Routes>
            <Route index element={<Layout title="Pedidos"><PedidosScreen /></Layout>} />
            <Route path="productos" element={<Layout title="Catálogo"><ProductosScreen /></Layout>} />
            <Route path="clientes" element={<Layout title="Clientes"><ClientesScreen /></Layout>} />
            <Route path="ajustes" element={<Layout title="Ajustes"><AjustesScreen /></Layout>} />
            <Route path="*" element={<Navigate to="/panel" replace />} />
          </Routes>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  );
}
