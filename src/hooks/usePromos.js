import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function usePromos() {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promos')
      .select('*')
      .order('orden', { ascending: true });
    if (!error) setPromos(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const createPromo = useCallback(async (patch) => {
    const { data, error } = await supabase.from('promos').insert(patch).select().single();
    if (!error) setPromos((p) => [...p, data]);
    return { data, error };
  }, []);

  const updatePromo = useCallback(async (id, patch) => {
    setPromos((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('promos').update(patch).eq('id', id);
    if (error) load();
    return { error };
  }, [load]);

  const deletePromo = useCallback(async (id) => {
    setPromos((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('promos').delete().eq('id', id);
    if (error) load();
    return { error };
  }, [load]);

  return { promos, loading, reload: load, createPromo, updatePromo, deletePromo };
}
