// cambiosPanel.js — anota en el historial (lib/historialPanel.js) los cambios del
// panel, con la forma de deshacerlos contra la base.
//
// Los hooks (useProducts, useOrders, useCustomers, useSettings) llaman a estas
// funciones DESPUES de que el cambio se guardo bien. Deshacer escribe en la base
// y avisa a las pantallas abiertas por la memoria compartida (cachePanel), asi
// se ve el cambio aunque la pantalla donde se hizo ya no este abierta.
import { supabase } from './supabase';
import { actualizarCache } from './cachePanel';
import { registrar, iguales, elegir } from './historialPanel';
import { diferenciaCiclo, diferenciaAjustes } from './cicloDeshacer';

const falla = (error) => { if (error) throw new Error(error.message || 'la base no contestó'); };

const mezclar = (clave, id, patch) => actualizarCache(clave, (lista) => (lista || []).map((x) => (x.id === id ? { ...x, ...patch } : x)));

/**
 * Un cambio de campos en una fila (editar, pausar, cambiar el estado de un pedido).
 *   tabla/clave  'products' / 'products', 'orders' / 'orders', 'customers' / 'customers'
 *   previo       la fila como estaba ANTES de tocarla
 *   patch        lo que se escribio
 * No anota nada si el cambio no cambia nada.
 */
export function registrarEdicion({ tabla, clave = tabla, id, previo, patch, etiqueta }) {
  if (!previo) return;
  const antes = elegir(previo, Object.keys(patch));
  if (iguales(antes, patch)) return;
  const escribir = (valores) => async () => {
    const { error } = await supabase.from(tabla).update(valores).eq('id', id);
    falla(error);
    mezclar(clave, id, valores);
  };
  registrar({ etiqueta, deshacer: escribir(antes), rehacer: escribir(patch) });
}

/** Los ajustes (una sola fila, id 1). */
export function registrarAjustes({ previo, patch, etiqueta }) {
  const antes = elegir(previo, Object.keys(patch));
  if (iguales(antes, patch)) return;
  const escribir = (valores) => async () => {
    const { error } = await supabase.from('settings').update(valores).eq('id', 1);
    falla(error);
    actualizarCache('settings', (s) => ({ ...(s || {}), ...valores }));
  };
  registrar({ etiqueta, deshacer: escribir(antes), rehacer: escribir(patch) });
}

const insertar = (fila) => async () => {
  const { error } = await supabase.from('products').insert(fila);
  falla(error);
  actualizarCache('products', (lista) => [...(lista || []).filter((x) => x.id !== fila.id), fila]
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
};
const borrar = (id) => async () => {
  const { error } = await supabase.from('products').delete().eq('id', id);
  falla(error);
  actualizarCache('products', (lista) => (lista || []).filter((x) => x.id !== id));
};

/** Un perfume nuevo (deshacer lo borra) o un perfume borrado (deshacer lo vuelve a crear igual). */
export function registrarAlta(fila) {
  registrar({ etiqueta: `Crear ${fila.nombre}`, deshacer: borrar(fila.id), rehacer: insertar(fila) });
}
export function registrarBaja(fila) {
  registrar({ etiqueta: `Borrar ${fila.nombre}`, deshacer: insertar(fila), rehacer: borrar(fila.id) });
}

/**
 * Una carga de ciclo entera. Se compara el catalogo de antes con el de despues:
 * deshacer borra los perfumes que creo el ciclo (una sola orden: si la base lo
 * rechaza, no se toca nada) y despues vuelve a poner las filas como estaban.
 */
export function registrarCiclo({ antes, despues, ajustesAntes, ajustesDespues, nombre }) {
  const d = diferenciaCiclo(antes, despues);
  const aj = diferenciaAjustes(ajustesAntes, ajustesDespues);
  if (!d.cambiadosAntes.length && !d.creados.length && !aj.cambio) return;

  const poner = async (filas, ajustes) => {
    if (filas.length) {
      const { error } = await supabase.from('products').upsert(filas, { onConflict: 'id' });
      falla(error);
    }
    if (ajustes.cambio) {
      const { error } = await supabase.from('settings').update(ajustes.valores).eq('id', 1);
      falla(error);
    }
  };

  registrar({
    etiqueta: nombre || 'Cargar ciclo',
    deshacer: async () => {
      if (d.creados.length) {
        const { error } = await supabase.from('products').delete().in('id', d.creados.map((x) => x.id));
        falla(error);
      }
      await poner(d.cambiadosAntes, { cambio: aj.cambio, valores: aj.antes });
      const volver = new Map(d.cambiadosAntes.map((x) => [x.id, x]));
      const creadas = new Set(d.creados.map((x) => x.id));
      actualizarCache('products', (lista) => (lista || []).filter((x) => !creadas.has(x.id)).map((x) => volver.get(x.id) || x));
      if (aj.cambio) actualizarCache('settings', (s) => ({ ...(s || {}), ...aj.antes }));
    },
    rehacer: async () => {
      await poner([...d.cambiadosDespues, ...d.creados], { cambio: aj.cambio, valores: aj.despues });
      const nuevas = new Map(d.cambiadosDespues.map((x) => [x.id, x]));
      actualizarCache('products', (lista) => [...(lista || []).map((x) => nuevas.get(x.id) || x), ...d.creados]
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)));
      if (aj.cambio) actualizarCache('settings', (s) => ({ ...(s || {}), ...aj.despues }));
    },
  });
}
