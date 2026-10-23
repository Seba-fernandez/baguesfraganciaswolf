import { useCallback, useState } from 'react';
import { crearPedidoWeb } from '../lib/apiTienda';
import { PEDIDO } from '../config/contenido';
import { registrarError } from '../lib/errores.js';

/**
 * Checkout público: llama a la función crear_pedido_web() (SECURITY DEFINER).
 * Es el ÚNICO punto de entrada por el que la web escribe en la base.
 *
 * Va por el cliente REST de la tienda (src/lib/apiTienda.js), no por
 * @supabase/supabase-js: es una sola llamada y no justifica arrastrar el
 * paquete entero al bundle público. La función del lado del servidor es la
 * misma y valida igual.
 */
export default function useCheckoutWeb() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enviarPedido = useCallback(async ({ nombre, telefono, items }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await crearPedidoWeb({ nombre, telefono, items });
      return { data };
    } catch (e) {
      // Queda anotado para Sebas (panel > Ajustes): el codigo del error de la
      // base (telefono_invalido, pedido_muy_seguido...) y cuantos items eran.
      registrarError('pedido', e?.message, `items: ${items?.length ?? 0}`);
      setError(PEDIDO.errorBase);
      return { error: e };
    } finally {
      setLoading(false);
    }
  }, []);

  return { enviarPedido, loading, error };
}
