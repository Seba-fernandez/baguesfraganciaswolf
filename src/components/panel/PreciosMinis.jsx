import { useEffect, useMemo, useState } from 'react';
import { pesos } from '../../lib/format';
import { minisDe, resumenPrecios, armarCambio, ML_MINI } from '../../lib/minis.js';
import { aplicarPreciosMinis } from '../../lib/ciclo/servidor.js';
import s from './panel.module.css';
import m from './PreciosMinis.module.css';

const LISTA = [
  ['mantener', 'Dejar el de cada una'],
  ['igual', 'Uno para todas'],
  ['sacar', 'Sin tachado'],
];

/**
 * Hoja para cambiar de una vez el precio de las minis (menos de 50 ml).
 * La cuenta vive en lib/minis.js; aca solo se elige y se confirma.
 */
export default function PreciosMinis({ products, onClose, onAplicado }) {
  const [conPausadas, setConPausadas] = useState(false);
  const [destildadas, setDestildadas] = useState(() => new Set());
  const [precio, setPrecio] = useState('');
  const [modoLista, setModoLista] = useState('mantener');
  const [valorLista, setValorLista] = useState('');
  const [saltosOk, setSaltosOk] = useState(false);
  const [etapa, setEtapa] = useState('editar'); // editar | confirmar | aplicando | hecho
  const [error, setError] = useState(null);
  const [cambiadas, setCambiadas] = useState(0);

  const minis = useMemo(() => minisDe(products, { conPausadas }), [products, conPausadas]);
  const resumen = useMemo(() => resumenPrecios(minis), [minis]);
  const elegidos = useMemo(() => new Set(minis.map((x) => x.codigo).filter((c) => !destildadas.has(c))), [minis, destildadas]);
  const cambio = useMemo(
    () => armarCambio(minis, elegidos, precio, { modo: modoLista, valor: valorLista }),
    [minis, elegidos, precio, modoLista, valorLista],
  );
  const escribio = precio.trim() !== '';
  const puede = escribio && !cambio.errores.length && cambio.operaciones.length > 0 && (!cambio.saltos.length || saltosOk);

  useEffect(() => {
    const alTeclear = (e) => { if (e.key === 'Escape' && etapa !== 'aplicando') onClose(); };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [etapa, onClose]);

  // Si cambia lo que se va a hacer, la confirmacion de los saltos vuelve a cero.
  useEffect(() => { setSaltosOk(false); }, [precio, modoLista, valorLista, destildadas, conPausadas]);

  function tildar(codigo) {
    setDestildadas((d) => {
      const n = new Set(d);
      if (n.has(codigo)) n.delete(codigo); else n.add(codigo);
      return n;
    });
    if (etapa === 'confirmar') setEtapa('editar');
  }

  async function aplicar() {
    if (etapa === 'editar') { setEtapa('confirmar'); return; }
    setEtapa('aplicando');
    setError(null);
    try {
      const r = await aplicarPreciosMinis(cambio.operaciones);
      setCambiadas(r?.precios ?? cambio.operaciones.length);
      setEtapa('hecho');
      await onAplicado?.();
    } catch (err) {
      setError(err.message);
      setEtapa('editar');
    }
  }

  const textoResumen = resumen.length
    ? resumen.map((r) => `${r.cantidad} a ${pesos(r.precio)}`).join(', ')
    : 'Ninguna';
  const n = cambio.operaciones.length;

  return (
    <>
      <div className={s.overlay} onClick={etapa === 'aplicando' ? undefined : onClose} />
      <div className={`${s.sheet} glass-strong`} role="dialog" aria-modal="true" aria-labelledby="minis-titulo">
        <span className={s.handle} />
        <h3 className={s.sheetTitle} id="minis-titulo">Precio de las minis</h3>

        {etapa === 'hecho' ? (
          <>
            <p className={m.texto}>Listo: {cambiadas === 1 ? 'cambió 1 precio' : `cambiaron ${cambiadas} precios`}. Antes se guardó una copia del catálogo.</p>
            <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnWide}`} onClick={onClose}>Cerrar</button>
          </>
        ) : (
          <>
            <p className={m.texto}>
              Los tamaños de menos de {ML_MINI} ml. Se cambian todos juntos: si algo falla no cambia ninguno, y antes se guarda una copia del catálogo.
            </p>
            <p className={m.resumen}>
              <b>{minis.length} {minis.length === 1 ? 'mini' : 'minis'}{conPausadas ? '' : ' activas'}</b>: {textoResumen}
            </p>

            <div className={s.field}>
              <label className={s.label} htmlFor="minis-precio">Precio nuevo</label>
              <input
                id="minis-precio" className={s.input} inputMode="numeric" autoComplete="off"
                placeholder={resumen[0] ? String(resumen[0].precio) : '21299'}
                value={precio} onChange={(e) => { setPrecio(e.target.value); if (etapa === 'confirmar') setEtapa('editar'); }}
              />
            </div>

            <div className={s.field}>
              <span className={s.label} id="minis-lista">Precio de lista (tachado)</span>
              <div className={s.options} role="radiogroup" aria-labelledby="minis-lista">
                {LISTA.map(([id, texto]) => (
                  <button
                    key={id} type="button" role="radio" aria-checked={modoLista === id}
                    className={`${s.option} ${modoLista === id ? `${s.optionOn} ${m.opcionOn}` : ''}`}
                    onClick={() => { setModoLista(id); if (etapa === 'confirmar') setEtapa('editar'); }}
                  >{texto}</button>
                ))}
              </div>
              {modoLista === 'igual' && (
                <input
                  className={s.input} inputMode="numeric" autoComplete="off" aria-label="Precio de lista para todas"
                  placeholder="23599" value={valorLista}
                  onChange={(e) => { setValorLista(e.target.value); if (etapa === 'confirmar') setEtapa('editar'); }}
                />
              )}
            </div>

            <label className={m.casilla}>
              <input type="checkbox" checked={conPausadas} onChange={(e) => setConPausadas(e.target.checked)} />
              Incluir las minis pausadas
            </label>

            {escribio && cambio.errores.length > 0 && (
              <ul className={m.errores} role="alert">
                {cambio.errores.map((e) => <li key={e}>{e}</li>)}
              </ul>
            )}
            {cambio.saltos.length > 0 && !cambio.errores.length && (
              <label className={`${m.casilla} ${m.aviso}`}>
                <input type="checkbox" checked={saltosOk} onChange={(e) => setSaltosOk(e.target.checked)} />
                El precio cambia más de la mitad en {cambio.saltos.length === 1 ? cambio.saltos[0] : `${cambio.saltos.length} minis`}. Lo revisé.
              </label>
            )}
            {error && <p className={m.errores} role="alert">{error}</p>}

            {etapa === 'editar' ? (
              <button type="button" className={`${s.btn} ${s.btnPrimary} ${s.btnWide}`} disabled={!puede} onClick={aplicar}>
                {n ? `Cambiar ${n === 1 ? '1 mini' : `${n} minis`}` : 'Cambiar minis'}
              </button>
            ) : (
              <div className={s.btnRow}>
                <button type="button" className={`${s.btn} ${s.btnGhost}`} disabled={etapa === 'aplicando'} onClick={() => setEtapa('editar')}>Volver</button>
                <button type="button" className={`${s.btn} ${s.btnPrimary}`} disabled={etapa === 'aplicando' || !puede} onClick={aplicar}>
                  {etapa === 'aplicando' ? 'Cambiando…' : `Sí, cambiar ${n}`}
                </button>
              </div>
            )}
            {etapa === 'confirmar' && (
              <p className={m.texto}>¿Cambio {n === 1 ? '1 precio' : `${n} precios`} a {pesos(cambio.filas.find((f) => f.cambia)?.nuevoPrecio ?? 0)}? Se guarda una copia antes.</p>
            )}
            <p className={m.subtitulo}>Tocá una para dejarla como está.</p>
            <ul className={m.lista} aria-label="Minis que se cambian">
              {cambio.filas.map((f) => (
                <li key={f.codigo} className={`${m.fila} ${f.elegida ? '' : m.fuera}`}>
                  <label className={m.filaTilde}>
                    <input type="checkbox" checked={f.elegida} onChange={() => tildar(f.codigo)} aria-label={`Incluir ${f.nombre} ${f.ml} ml`} />
                    <span className={m.nombre}>
                      {f.nombre} <span className={m.ml}>{f.ml} ml{f.activa ? '' : ' · pausada'}</span>
                    </span>
                  </label>
                  <span className={m.precios}>
                    {f.cambia ? (
                      <>
                        <span className={m.antes}>{pesos(f.precio)}</span>
                        <span aria-hidden="true"> → </span>
                        <span className={m.despues}>{pesos(f.nuevoPrecio)}</span>
                        <span className={m.tachado}>{f.nuevaLista ? `lista ${pesos(f.nuevaLista)}` : 'sin tachado'}</span>
                      </>
                    ) : (
                      <>
                        <span className={m.despues}>{pesos(f.precio)}</span>
                        <span className={m.tachado}>{f.elegida && escribio ? 'sin cambio' : f.precio_anterior ? `lista ${pesos(f.precio_anterior)}` : 'sin tachado'}</span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>

          </>
        )}
      </div>
    </>
  );
}
