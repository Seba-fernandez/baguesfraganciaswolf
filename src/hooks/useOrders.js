import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { normalizarTelefono } from '../lib/whatsapp';

const SELECT = `
  *,
  customer:customers ( id, nombre, telefono, notas ),
  items:order_items ( id, product_id, nombre_snapshot, ml, cantidad, precio_unitario )
`;

/** Próximo viernes a partir de hoy (para fecha_retiro_estimada por defecto). */
export function proximoViernes(desde = new Date()) {
  const d = new Date(desde);
  const diff = (5 - d.getDay() + 7) % 7 || 7; // 5 = viernes
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export default function useOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(SELECT)
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setOrders(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime: cuando entra un pedido de la web, refrescamos.
  useEffect(() => {
    const ch = supabase
      .channel('orders-stream')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const updateOrder = useCallback(async (id, patch) => {
    setOrders((o) => o.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await supabase.from('orders').update(patch).eq('id', id);
    if (error) { setError(error.message); load(); }
    return { error };
  }, [load]);

  /**
   * Carga un pedido a mano (el que te llegó por WhatsApp).
   * cliente: { nombre, telefono }
   * items:   [{ product_id?, nombre_snapshot, ml, cantidad, precio_unitario }]
   */
  const createOrderManual = useCallback(async ({ cliente, items, estado = 'nuevo', notas_conversacion = '' }) => {
    const nombre = (cliente?.nombre || '').trim();
    const tel = normalizarTelefono(cliente?.telefono);
    if (!nombre) return { error: 'Falta el nombre del cliente' };
    if (tel.length < 8) return { error: 'Teléfono inválido' };
    if (!items?.length) return { error: 'Agregá al menos un perfume' };

    const { data: customer, error: e1 } = await supabase
      .from('customers')
      .upsert({ nombre, telefono: tel }, { onConflict: 'telefono' })
      .select()
      .single();
    if (e1) return { error: e1.message };

    const total = items.reduce((acc, it) => acc + (Number(it.precio_unitario) || 0) * (Number(it.cantidad) || 1), 0);

    const { data: order, error: e2 } = await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        canal: 'manual',
        estado,
        notas_conversacion,
        total_estimado: total,
        fecha_retiro_estimada: proximoViernes(),
      })
      .select()
      .single();
    if (e2) return { error: e2.message };

    const filas = items.map((it) => ({
      order_id: order.id,
      product_id: it.product_id || null,
      nombre_snapshot: it.nombre_snapshot,
      ml: it.ml ? Number(it.ml) : null,
      cantidad: Number(it.cantidad) || 1,
      precio_unitario: Number(it.precio_unitario) || 0,
    }));
    const { error: e3 } = await supabase.from('order_items').insert(filas);
    if (e3) return { error: e3.message };

    await load();
    return { data: order };
  }, [load]);

  const deleteOrder = useCallback(async (id) => {
    setOrders((o) => o.filter((x) => x.id !== id));
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) { setError(error.message); load(); }
    return { error };
  }, [load]);

  return { orders, loading, error, reload: load, updateOrder, createOrderManual, deleteOrder };
}
