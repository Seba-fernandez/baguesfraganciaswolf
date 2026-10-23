import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import s from './panel.module.css';

/**
 * Errores de la tienda (panel > Ajustes). Lo que anota src/lib/errores.js
 * cuando a una clienta se le rompe algo: un error de JavaScript o un pedido
 * que la base no pudo guardar. Se guardan 30 dias.
 *
 * Que mirar: si aparece uno de "pedido" o muchos iguales seguidos, algo esta
 * fallando de verdad. Uno suelto de "js" en un navegador viejo suele no
 * importar. Con la version (el commit) se sabe si fue antes o despues de un
 * cambio.
 */
const TIPOS = { js: 'Error de la página', promesa: 'Error de la página', pedido: 'Pedido que no se guardó', red: 'Sin conexión', prueba: 'Prueba' };

function cuando(fecha) {
  return new Date(fecha).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function navegadorCorto(ua = '') {
  const so = /iPhone|iPad/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : '';
  const nav = /CriOS|Chrome\//.test(ua) && !/Edg/.test(ua) ? 'Chrome' : /Firefox|FxiOS/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : /Edg/.test(ua) ? 'Edge' : '';
  return [nav, so].filter(Boolean).join(' en ') || 'Navegador desconocido';
}

export default function ErroresTienda() {
  const [lista, setLista] = useState(null);
  const [abierto, setAbierto] = useState(false);

  async function cargar() {
    const { data, error } = await supabase
      .from('errores_web').select('*').order('creado', { ascending: false }).limit(50);
    setLista(error ? [] : data);
  }
  useEffect(() => { cargar(); }, []);

  async function borrarTodos() {
    if (!lista?.length) return;
    await supabase.from('errores_web').delete().lte('id', lista[0].id);
    cargar();
  }

  const semana = (lista || []).filter((e) => Date.now() - new Date(e.creado) < 7 * 864e5).length;

  return (
    <div className={s.card}>
      <div className={s.cardRow}>
        <span className={s.cardName} style={{ fontSize: 14 }}>Errores de la tienda</span>
        <span className={s.cardMeta}>
          {lista === null ? 'Cargando…' : semana ? `${semana} en los últimos 7 días` : 'Ninguno esta semana'}
        </span>
      </div>
      {lista?.length > 0 && (
        <>
          <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ marginTop: 10 }} onClick={() => setAbierto((v) => !v)}>
            {abierto ? 'Ocultar' : `Ver ${lista.length}`}
          </button>
          {abierto && (
            <ul style={{ listStyle: 'none', margin: '12px 0 0', padding: 0, display: 'grid', gap: 10 }}>
              {lista.map((e) => (
                <li key={e.id} style={{ borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                  <div className={s.cardRow}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{TIPOS[e.tipo] || e.tipo}</span>
                    <span className={s.cardMeta}>{cuando(e.creado)}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 4, wordBreak: 'break-word' }}>{e.mensaje}</div>
                  <div className={s.cardMeta} style={{ marginTop: 4 }}>
                    {navegadorCorto(e.navegador)} · {e.ruta || '/'}{e.version ? ` · versión ${e.version}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {abierto && (
            <button type="button" className={`${s.btn} ${s.btnGhost}`} style={{ marginTop: 12 }} onClick={borrarTodos}>
              Ya los vi, borrarlos
            </button>
          )}
        </>
      )}
    </div>
  );
}
