import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import AuthGate from '../auth/AuthGate';
import Layout from '../layout/Layout';
import '../../styles/global.css';
import PedidosScreen from './PedidosScreen';
import ProductosScreen from './ProductosScreen';
import ClientesScreen from './ClientesScreen';
import AjustesScreen from './AjustesScreen';
import { precargarPedidos } from '../../hooks/useOrders';
import { precargarProductos } from '../../hooks/useProducts';
import { precargarClientes } from '../../hooks/useCustomers';
import { precargarAjustes } from '../../hooks/useSettings';

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
 * Las cuatro pantallas van juntas en este mismo chunk. Antes cada una era lazy
 * y cambiar de pestaña era esperar una descarga más: son pocos kB y quien entra
 * acá las usa todas, así que conviene bajarlas de una vez.
 */

/**
 * Apenas el portero confirma la sesión, trae pedidos, catálogo, clientes y
 * ajustes en paralelo y los deja en memoria (lib/cachePanel). Cada pestaña se
 * abre con sus datos ya listos.
 */
function Precarga() {
  useEffect(() => {
    precargarPedidos();
    precargarProductos();
    precargarClientes();
    precargarAjustes();
  }, []);
  return null;
}

export default function PanelApp() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <Precarga />
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
