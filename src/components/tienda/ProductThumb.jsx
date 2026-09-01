import s from './ProductThumb.module.css';

/**
 * Miniatura de producto. Si hay foto real, se muestra tal cual (a color —
 * forzar B/N sobre una foto de celular la arruina). Sin foto: placeholder
 * con bloque de color, para que la grilla nunca se vea rota.
 *
 * accent: 'cream' (claro, ícono oscuro) | 'wine' | 'pine' (oscuros, ícono claro)
 */
export default function ProductThumb({ src, alt, accent = 'cream' }) {
  if (src) {
    return (
      <div className={s.wrap}>
        <img src={src} alt={alt} loading="lazy" className={s.img} />
      </div>
    );
  }
  const oscuro = accent === 'wine' || accent === 'pine';
  return (
    <div className={`${s.wrap} ${s.placeholder}`}>
      <span className={`${s.block} ${s[accent] || ''}`} aria-hidden="true" />
      <svg
        className={`${s.glyph} ${oscuro ? s.glyphClaro : ''}`}
        width="30%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"
      >
        <rect x="9" y="4" width="6" height="14" rx="1.5" /><rect x="10" y="2" width="4" height="2.5" />
      </svg>
    </div>
  );
}
