import { useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import s from './ImageUpload.module.css';

/**
 * Sube una imagen a Supabase Storage y devuelve la URL pública por onChange.
 * bucket: 'productos' | 'promos'
 */
export default function ImageUpload({ value, onChange, bucket = 'productos' }) {
  const inputRef = useRef(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB'); return; }

    setSubiendo(true);
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    });
    if (upErr) { setError(upErr.message); setSubiendo(false); return; }

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    onChange(data.publicUrl);
    setSubiendo(false);
  }

  return (
    <div className={s.wrap}>
      <button
        type="button"
        className={s.drop}
        onClick={() => inputRef.current?.click()}
        disabled={subiendo}
      >
        {value ? (
          <img src={value} alt="Vista previa" className={s.preview} />
        ) : (
          <span className={s.placeholder}>{subiendo ? 'Subiendo…' : '+ Foto'}</span>
        )}
      </button>
      {value && (
        <button type="button" className={s.clear} onClick={() => onChange('')}>
          Quitar
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFile}
      />
      {error && <p className={s.error}>{error}</p>}
    </div>
  );
}
