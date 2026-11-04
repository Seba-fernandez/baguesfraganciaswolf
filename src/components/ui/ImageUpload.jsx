import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import s from './ImageUpload.module.css';

/**
 * Sube una imagen a Supabase Storage y devuelve la URL pública por onChange.
 * bucket: 'productos' | 'promos'
 * respaldo: foto que se muestra cuando no se subió ninguna (la del catálogo).
 *   Tocar sube una nueva, que pasa a ganarle.
 * fondo: si es true (fotos de perfumes), antes de subir saca el fondo y arma
 *   la foto sobre la pared vino (lib/recorteFondo.js, se carga recién acá).
 *   Muestra la original y la armada para elegir. "Arreglar el fondo" hace lo
 *   mismo con la foto que ya está subida.
 */
export default function ImageUpload({ value, onChange, bucket = 'productos', respaldo = null, fondo = false }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [armando, setArmando] = useState(false);
  const [propuesta, setPropuesta] = useState(null); // { blob, tipo, url, aviso, original, originalUrl }
  const [error, setError] = useState(null);
  const [originalPendiente, setOriginalPendiente] = useState(null);

  // Las vistas previas son URLs de memoria: se liberan al cambiar o al cerrar.
  useEffect(() => () => {
    if (propuesta?.url) URL.revokeObjectURL(propuesta.url);
    if (propuesta?.originalUrl && propuesta.original) URL.revokeObjectURL(propuesta.originalUrl);
  }, [propuesta]);

  async function subir(blob, ext, contentType) {
    setSubiendo(true);
    setError(null);
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, {
      cacheControl: '31536000',
      upsert: false,
      contentType,
    });
    setSubiendo(false);
    if (upErr) { setError(upErr.message); return false; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
    return true;
  }

  const extDe = (file) => file.name?.split('.').pop()?.toLowerCase() || 'jpg';

  async function armar(fuente, original) {
    setArmando(true);
    setError(null);
    setOriginalPendiente(null);
    try {
      const { armarFotoProducto } = await import('../../lib/recorteFondo.js');
      const r = await armarFotoProducto(fuente);
      setPropuesta({
        blob: r.blob, tipo: r.tipo, aviso: r.aviso, url: URL.createObjectURL(r.blob),
        original, originalUrl: original ? URL.createObjectURL(original) : fuente,
      });
    } catch (err) {
      setError(`No pude sacar el fondo: ${err.message}`);
      if (original) setOriginalPendiente(original);
    }
    setArmando(false);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > (fondo ? 15 : 5) * 1024 * 1024) { setError(`Máximo ${fondo ? 15 : 5} MB`); return; }
    if (fondo) { armar(file, file); return; }
    subir(file, extDe(file), file.type || undefined);
  }

  async function usarArmada() {
    const ext = propuesta.tipo === 'image/webp' ? 'webp' : 'jpg';
    if (await subir(propuesta.blob, ext, propuesta.tipo)) setPropuesta(null);
  }

  async function usarOriginal() {
    const original = propuesta?.original || originalPendiente;
    if (!original) { setPropuesta(null); return; }
    if (await subir(original, extDe(original), original.type || undefined)) { setPropuesta(null); setOriginalPendiente(null); }
  }

  const ocupado = subiendo || armando;

  if (propuesta) {
    return (
      <div className={s.wrap}>
        <div className={s.comparar}>
          <figure className={s.opcion}>
            <img src={propuesta.originalUrl} alt="Foto original" />
            <figcaption>{propuesta.original ? 'Original' : 'La de ahora'}</figcaption>
          </figure>
          <figure className={`${s.opcion} ${s.opcionNueva}`}>
            <img src={propuesta.url} alt="Foto armada sobre la pared vino" />
            <figcaption>Con la pared</figcaption>
          </figure>
        </div>
        {propuesta.aviso && <p className={s.aviso}>{propuesta.aviso}</p>}
        <div className={s.acciones}>
          <button type="button" className={s.usar} onClick={usarArmada} disabled={ocupado}>
            {subiendo ? 'Guardando…' : 'Usar esta'}
          </button>
          <button type="button" className={s.dejar} onClick={usarOriginal} disabled={ocupado}>
            {propuesta.original ? 'Dejar la original' : 'Dejar como estaba'}
          </button>
        </div>
        {error && <p className={s.error}>{error}</p>}
      </div>
    );
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.drop}
        onClick={() => inputRef.current?.click()}
        disabled={ocupado}
      >
        {armando ? (
          <span className={s.placeholder}>Sacando el fondo…</span>
        ) : value || respaldo ? (
          <img src={value || respaldo} alt="Vista previa" className={s.preview} />
        ) : (
          <span className={s.placeholder}>{subiendo ? 'Subiendo…' : '+ Foto'}</span>
        )}
      </button>
      {armando && <p className={s.nota}>La primera vez baja el recortador (unos segundos).</p>}
      <div className={s.fila}>
        {fondo && value && !armando && (
          <button type="button" className={s.clear} onClick={() => armar(value, null)} disabled={ocupado}>
            Arreglar el fondo
          </button>
        )}
        {value && !armando && (
          <button type="button" className={s.clear} onClick={() => onChange('')} disabled={ocupado}>
            Quitar
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
      {error && <p className={s.error}>{error}</p>}
      {originalPendiente && !armando && (
        <button type="button" className={s.clear} onClick={usarOriginal} disabled={ocupado}>
          Subir la original igual
        </button>
      )}
    </div>
  );
}
