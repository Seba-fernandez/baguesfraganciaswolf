import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Checkout público: llama a la función crear_pedido_web() (SECURITY DEFINER).
 * Es el ÚNICO punto de entrada por el que la web escribe en la base.
 */
export default function useCheckoutWeb() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enviarPedido = useCallback(async ({ nombre, telefono, items }) => {
    setLoading(true);
    setError(null);

    const payload = items.map((it) => ({
      product_id: it.productId,
      ml: it.ml,
      cantidad: it.cantidad,
    }));

    const { data, error } = await supabase.rpc('crear_pedido_web', {
      p_nombre: nombre,
      p_telefono: telefono,
      p_items: payload,
    });

    setLoading(false);
    if (error) {
      setError('No pudimos registrar el pedido. Probá de nuevo o escribinos directo.');
      return { error };
    }
    const row = Array.isArray(data) ? data[0] : data;
    return { data: row };
  }, []);

  return { enviarPedido, loading, error };
}
