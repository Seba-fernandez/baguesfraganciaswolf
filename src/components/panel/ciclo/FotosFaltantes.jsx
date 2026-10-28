import { useEffect, useMemo, useRef, useState } from 'react';
import { fotoDe } from '../../../lib/fotos';
import { fotosQueFaltan } from '../../../lib/ciclo/panel.js';
import { buscarCaja, imagenDeTienda, subirFoto, ponerFoto } from '../../../lib/ciclo/servidor.js';
import { fotoEnPared } from '../../../lib/ciclo/fotoPared.js';
import ImageUpload from '../../ui/ImageUpload';
import s from '../panel.module.css';
import c from './Ciclo.module.css';

/** Las URL locales de las fotos bajadas se liberan al salir. */
function useUrlsLocales() {
  const urls = useRef([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);
  return (blob) => {
    const u = URL.createObjectURL(blob);
    urls.current.push(u);
    return u;
  };
}

function UnaFoto({ item, alCambiar }) {
  const { producto, linea, caja } = item;
  const [estado, setEstado] = useState('quieto'); // quieto | buscando | eligiendo | armando | previa | guardando
  const [opciones, setOpciones] = useState([]); // [{ url, local }]
  const [previa, setPrevia] = useState(null); // { blob, local, aviso }
  const [error, setError] = useState(null);
  const urlLocal = useUrlsLocales();

  async function buscar() {
    setEstado('buscando');
    setError(null);
    try {
      const q = caja || producto.nombre;
      const resultados = await buscarCaja('bagues', q);
      const imagenes = [...new Set(resultados.flatMap((r) => r.imagenes))].slice(0, 6);
      if (!imagenes.length) {
        setError(`No encontré “${q}” en bagues.com.ar. Subí una foto tuya de la caja.`);
        setEstado('quieto');
        return;
      }
      const bajadas = await Promise.all(imagenes.map(async (url) => {
        try { const blob = await imagenDeTienda(url); return { url, blob, local: urlLocal(blob) }; } catch { return null; }
      }));
      setOpciones(bajadas.filter(Boolean));
      setEstado('eligiendo');
    } catch (e) {
      setError(e.message);
      setEstado('quieto');
    }
  }

  async function armar(opcion) {
    setEstado('armando');
    setError(null);
    try {
      const r = await fotoEnPared(opcion.blob);
      setPrevia({ ...r, local: urlLocal(r.blob) });
      setEstado('previa');
    } catch (e) {
      setError(`No pude armar la foto: ${e.message}`);
      setEstado('eligiendo');
    }
  }

  async function guardar() {
    setEstado('guardando');
    setError(null);
    try {
      await subirFoto(producto, previa.blob);
      await alCambiar();
    } catch (e) {
      setError(e.message);
      setEstado('previa');
    }
  }

  async function propia(url) {
    setError(null);
    try { await ponerFoto(producto, url); await alCambiar(); } catch (e) { setError(e.message); }
  }

  return (
    <li className={c.foto}>
      <div className={c.fotoCabeza}>
        <span className={c.filaNombre}>{producto.nombre}</span>
        <span className={c.filaDato}>{linea === 'bagues' ? `Bagués${caja ? `, caja ${caja}` : ''}` : 'Unlock'}</span>
      </div>

      {estado === 'eligiendo' && (
        <>
          <p className={c.ayuda}>Tocá la foto de la caja sola, con fondo transparente:</p>
          <div className={c.resultados}>
            {opciones.map((o) => (
              <button key={o.url} type="button" className={c.resultado} onClick={() => armar(o)} aria-label="Usar esta foto">
                <img src={o.local} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
      {estado === 'armando' && <p className={c.ayuda}>Armando la foto sobre la pared…</p>}
      {(estado === 'previa' || estado === 'guardando') && previa && (
        <>
          <img className={c.previa} src={previa.local} alt={`Foto armada de ${producto.nombre}`} />
          {previa.aviso && <p className={c.aviso}>{previa.aviso}</p>}
          <div className={c.acciones}>
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={() => setEstado('eligiendo')} disabled={estado === 'guardando'}>Probar otra</button>
            <button type="button" className={`${s.btn} ${s.btnPrimary}`} onClick={guardar} disabled={estado === 'guardando'}>
              {estado === 'guardando' ? 'Guardando…' : 'Usar esta foto'}
            </button>
          </div>
        </>
      )}

      {(estado === 'quieto' || estado === 'buscando') && (
        <div className={c.acciones}>
          {linea === 'bagues' && (
            <button type="button" className={`${s.btn} ${s.btnGhost}`} onClick={buscar} disabled={estado === 'buscando'}>
              {estado === 'buscando' ? 'Buscando…' : 'Buscar la caja en bagues.com.ar'}
            </button>
          )}
        </div>
      )}
      {estado !== 'guardando' && estado !== 'armando' && (
        <div>
          <p className={c.filaDato} style={{ marginBottom: 6 }}>{linea === 'bagues' ? 'O subí una foto tuya:' : 'Subí una foto tuya del frasco:'}</p>
          <ImageUpload value={null} onChange={propia} bucket="productos" />
        </div>
      )}
      {error && <p className={c.bloqueo} role="alert">{error}</p>}
    </li>
  );
}

export default function FotosFaltantes({ productos, alCambiar }) {
  const faltan = useMemo(() => fotosQueFaltan(productos, (p) => fotoDe(p)), [productos]);
  return (
    <section className={c.paso} aria-labelledby="paso-fotos">
      <h3 id="paso-fotos" className={c.pasoTitulo}>3. Fotos que faltan</h3>
      {faltan.length === 0 ? (
        <p className={c.bien}>Todos los perfumes activos tienen foto.</p>
      ) : (
        <>
          <p className={c.ayuda}>
            {faltan.length === 1 ? 'Un perfume activo se ve' : `${faltan.length} perfumes activos se ven`} sin foto en la tienda.
            Las cajas de Bagués se buscan en su web y se arman solas sobre la pared vino; las de Unlock traen
            escena y necesitan una foto tuya del frasco.
          </p>
          <ul className={c.fotos} style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {faltan.map((f) => <UnaFoto key={f.producto.id} item={f} alCambiar={alCambiar} />)}
          </ul>
        </>
      )}
    </section>
  );
}
