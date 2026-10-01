import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { leerCache, guardarCache, traerConCache } from '../lib/cachePanel';

const DEFAULTS = {
  whatsapp_owner: '',
  instagram_user: '',
  mensaje_checkout: '',
  aclaracion_pedido: '',
  link_catalogo: '',
  promos_ciclo: [],
  ciclo_nombre: '',
  ciclo_hasta: null,
};

const CLAVE = 'settings';
const buscar = () => supabase.from('settings').select('*').eq('id', 1).single();

export const precargarAjustes = () => traerConCache(CLAVE, buscar);

export default function useSettings() {
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS, ...(leerCache(CLAVE) || {}) }));
  const [loading, setLoading] = useState(() => !leerCache(CLAVE));

  const load = useCallback(async () => {
    const { data } = await traerConCache(CLAVE, buscar);
    if (data) setSettings({ ...DEFAULTS, ...data });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!loading) guardarCache(CLAVE, settings); }, [settings, loading]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from('settings').update(patch).eq('id', 1);
    if (error) load();
    return { error };
  }, [load]);

  return { settings, loading, updateSettings };
}
