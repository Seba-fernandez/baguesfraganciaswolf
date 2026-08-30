import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Traemos clientes + sus pedidos (para contar y ver el último estado).
    const { data, error } = await supabase
      .from('customers')
      .select('*, orders ( id, numero, estado, total_estimado, created_at )')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else {
      setCustomers(
        (data || []).map((c) => ({
          ...c,
          pedidos: (c.orders || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
          totalPedidos: (c.orders || []).length,
        }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateCustomer = useCallback(async (id, patch) => {
    setCustomers((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('customers').update(patch).eq('id', id);
    if (error) { setError(error.message); load(); }
    return { error };
  }, [load]);

  return { customers, loading, error, reload: load, updateCustomer };
}
