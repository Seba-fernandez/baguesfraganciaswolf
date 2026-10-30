import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { leerCache, guardarCache, traerConCache, suscribirCache } from '../lib/cachePanel';
import { registrarEdicion } from '../lib/cambiosPanel';

const CLAVE = 'customers';

// Clientes + sus pedidos (para contar y ver el último estado), ya armados.
const buscar = async () => {
  const { data, error } = await supabase
    .from('customers')
    .select('*, orders ( id, numero, estado, total_estimado, created_at )')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error };
  return {
    error: null,
    data: (data || []).map((c) => ({
      ...c,
      pedidos: (c.orders || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      totalPedidos: (c.orders || []).length,
    })),
  };
};

export const precargarClientes = () => traerConCache(CLAVE, buscar);

export default function useCustomers() {
  const [customers, setCustomers] = useState(() => leerCache(CLAVE) || []);
  const [loading, setLoading] = useState(() => !leerCache(CLAVE));
  const [error, setError] = useState(null);
  const customersRef = useRef(customers);

  const load = useCallback(async () => {
    const { data, error } = await traerConCache(CLAVE, buscar);
    if (error) setError(error.message);
    else setCustomers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { customersRef.current = customers; if (!loading) guardarCache(CLAVE, customers); }, [customers, loading]);
  // Deshacer / rehacer cambia clientes por fuera de esta pantalla.
  useEffect(() => suscribirCache(CLAVE, setCustomers), []);

  const updateCustomer = useCallback(async (id, patch) => {
    const previo = customersRef.current.find((x) => x.id === id);
    customersRef.current = customersRef.current.map((x) => (x.id === id ? { ...x, ...patch } : x));
    setCustomers((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('customers').update(patch).eq('id', id);
    if (error) { setError(error.message); load(); } else registrarEdicion({ tabla: 'customers', id, previo, patch, etiqueta: `Editar cliente ${previo?.nombre || ''}`.trim() });
    return { error };
  }, [load]);

  return { customers, loading, error, reload: load, updateCustomer };
}
