import { useEffect, useState } from 'react';
import { traerProductos, traerAjustes } from '../lib/apiTienda';

/**
 * Los datos de la tienda publica: el catalogo y la configuracion, en un solo
 * pedido de red por tabla y una sola vez por visita.
 *
 * Es el reemplazo de useProducts + useSettings para la zona publica. Aquellos
 * siguen existiendo para el panel, porque ahi si hacen falta las escrituras y
 * la sesion. Aca no: esta version no arrastra @supabase/supabase-js.
 *
 * Los dos pedidos salen en paralelo. El catalogo manda el estado de carga: los
 * ajustes tienen valores por defecto razonables y la portada se dibuja sin
 * ellos.
 */

const AJUSTES_POR_DEFECTO = {
  whatsapp_owner: '',
  instagram_user: '',
  mensaje_checkout: '',
  aclaracion_pedido: '',
  link_catalogo: '',
  promos_ciclo: [],
  ciclo_nombre: '',
  ciclo_hasta: null,
};

export default function useDatosTienda() {
  const [products, setProducts] = useState([]);
  const [settings, setSettings] = useState(AJUSTES_POR_DEFECTO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let vivo = true;

    traerProductos()
      .then((filas) => { if (vivo) setProducts(filas || []); })
      .catch((e) => { if (vivo) setError(e.message); })
      .finally(() => { if (vivo) setLoading(false); });

    traerAjustes()
      .then((fila) => { if (vivo && fila) setSettings({ ...AJUSTES_POR_DEFECTO, ...fila }); })
      .catch(() => { /* la tienda se dibuja igual con los valores por defecto */ });

    return () => { vivo = false; };
  }, []);

  return { products, settings, loading, error };
}
