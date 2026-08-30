import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULTS = {
  whatsapp_owner: '',
  instagram_user: '',
  mensaje_checkout: '',
  aclaracion_pedido: '',
};

export default function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('settings').select('*').eq('id', 1).single();
    if (data) setSettings({ ...DEFAULTS, ...data });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateSettings = useCallback(async (patch) => {
    setSettings((s) => ({ ...s, ...patch }));
    const { error } = await supabase.from('settings').update(patch).eq('id', 1);
    if (error) load();
    return { error };
  }, [load]);

  return { settings, loading, updateSettings };
}
