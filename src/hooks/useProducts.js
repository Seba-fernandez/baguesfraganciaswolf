import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { leerCache, guardarCache, traerConCache, suscribirCache } from '../lib/cachePanel';
import { registrarEdicion, registrarAlta, registrarBaja } from '../lib/cambiosPanel';

// slug simple a partir del nombre: "Hawai Masculino" -> "hawai-masculino"
export function slugify(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const ORDEN = { column: 'orden', ascending: true };
const CLAVE = 'products';

/** Como se ve en la flecha de deshacer: "Pausar Sauvage", "Editar Sauvage". */
function etiquetaDe(producto, patch) {
  const nombre = producto?.nombre || 'perfume';
  const claves = Object.keys(patch);
  if (claves.length === 1 && claves[0] === 'activo') return `${patch.activo ? 'Activar' : 'Pausar'} ${nombre}`;
  if (claves.length === 1 && claves[0] === 'presentaciones') return `Precios de ${nombre}`;
  return `Editar ${nombre}`;
}

const buscar = () =>
  supabase
    .from('products')
    .select('*')
    .order(ORDEN.column, { ascending: ORDEN.ascending })
    .order('created_at', { ascending: true });

/** La usa PanelApp para tener el catálogo listo antes de abrir la pestaña. */
export const precargarProductos = () => traerConCache(CLAVE, buscar);

export default function useProducts() {
  // Arranca con lo que ya hay en memoria: sin "Cargando..." si ya se vio.
  const [products, setProducts] = useState(() => leerCache(CLAVE) || []);
  const [loading, setLoading] = useState(() => !leerCache(CLAVE));
  const [error, setError] = useState(null);
  // Lo ultimo que hay en pantalla, para saber como estaba un perfume antes de tocarlo.
  const productsRef = useRef(products);

  const load = useCallback(async () => {
    const { data, error } = await traerConCache(CLAVE, buscar);
    if (error) setError(error.message);
    else setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Los cambios locales (editar, pausar, borrar) también quedan en memoria.
  useEffect(() => { productsRef.current = products; if (!loading) guardarCache(CLAVE, products); }, [products, loading]);
  // Deshacer / rehacer cambia el catálogo por fuera de esta pantalla.
  useEffect(() => suscribirCache(CLAVE, setProducts), []);

  const createProduct = useCallback(async (patch) => {
    const nombre = (patch.nombre || '').trim();
    if (!nombre) return { error: 'Falta el nombre' };
    const row = {
      nombre,
      slug: patch.slug?.trim() || slugify(nombre),
      genero: patch.genero || 'unisex',
      momento: patch.momento || 'todo',
      familia_olfativa: patch.familia_olfativa || '',
      descripcion_corta: patch.descripcion_corta || '',
      descripcion_larga: patch.descripcion_larga || '',
      nota_salida: patch.nota_salida || '',
      nota_corazon: patch.nota_corazon || '',
      nota_fondo: patch.nota_fondo || '',
      imagen_url: patch.imagen_url || '',
      presentaciones: patch.presentaciones || [],
      activo: patch.activo ?? true,
      destacado: patch.destacado ?? false,
      orden: patch.orden ?? products.length,
    };
    const { data, error } = await supabase.from('products').insert(row).select().single();
    if (error) return { error: error.message };
    setProducts((p) => [...p, data]);
    registrarAlta(data);
    return { data };
  }, [products.length]);

  const updateProduct = useCallback(async (id, patch) => {
    const previo = productsRef.current.find((x) => x.id === id);
    productsRef.current = productsRef.current.map((x) => (x.id === id ? { ...x, ...patch } : x));
    setProducts((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) { setError(error.message); load(); } else registrarEdicion({ tabla: 'products', id, previo, patch, etiqueta: etiquetaDe(previo, patch) });
    return { error };
  }, [load]);

  const toggleActivo = useCallback((prod) => updateProduct(prod.id, { activo: !prod.activo }), [updateProduct]);

  const deleteProduct = useCallback(async (id) => {
    const previo = productsRef.current.find((x) => x.id === id);
    productsRef.current = productsRef.current.filter((x) => x.id !== id);
    setProducts((p) => p.filter((x) => x.id !== id));
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { setError(error.message); load(); } else if (previo) registrarBaja(previo);
    return { error };
  }, [load]);

  return { products, loading, error, reload: load, createProduct, updateProduct, toggleActivo, deleteProduct };
}
