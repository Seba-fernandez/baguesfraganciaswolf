import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { leerCache, guardarCache, traerConCache } from '../lib/cachePanel';

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

  const load = useCallback(async () => {
    const { data, error } = await traerConCache(CLAVE, buscar);
    if (error) setError(error.message);
    else setCustomers(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading) guardarCache(CLAVE, customers); }, [customers, loading]);

  const updateCustomer = useCallback(async (id, patch) => {
    setCustomers((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('customers').update(patch).eq('id', id);
    if (error) { setError(error.message); load(); }
    return { error };
  }, [load]);

  return { customers, loading, error, reload: load, updateCustomer };
}
