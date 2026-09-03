import { useId } from 'react';
import s from './ProductThumb.module.css';

// Colores base por acento (mismos hex que --cream/--wine/--pine de
// tienda.css) para armar el degradado del vidrio en SVG.
const ACCENT = {
  cream: { base: '#efdcb4', deep: '#c9a96e', shine: '#fff7e6' },
  wine: { base: '#9c2540', deep: '#5c1019', shine: '#e79aab' },
  pine: { base: '#1f5344', deep: '#0f2822', shine: '#7fbfa8' },
};

/**
 * Silueta de frasco con relleno degradado — reemplaza el glifo de contorno
 * plano. Intentamos primero un render WebGL real por producto (el mismo
 * modelo del hero) y resultó ser un riesgo de performance real: en
 * dispositivos/entornos sin GPU acelerada, cada render bloqueaba el hilo
 * principal varios segundos. Esta silueta es puramente CSS/SVG — cero costo
 * de render, protagonismo visual del frasco sin el riesgo.
 */
function Silueta({ accent }) {
  const uid = useId();
  const c = ACCENT[accent] || ACCENT.cream;
  const gradId = `bg-${uid}`;
  const shineId = `sh-${uid}`;
  return (
    <svg viewBox="0 0 100 160" className={s.silueta} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={c.deep} />
          <stop offset="45%" stopColor={c.base} />
          <stop offset="62%" stopColor={c.shine} />
          <stop offset="80%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.deep} />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* cuerpo */}
      <rect x="18" y="52" width="64" height="96" rx="16" fill={`url(#${gradId})`} />
      {/* hombro */}
      <polygon points="18,52 82,52 66,34 34,34" fill={`url(#${gradId})`} />
      {/* cuello */}
      <rect x="41" y="16" width="18" height="20" fill={`url(#${gradId})`} />
      {/* brillo vertical fijo (no depende de mouse/interacción) */}
      <rect x="60" y="40" width="7" height="100" rx="3.5" fill={`url(#${shineId})`} opacity="0.55" />
      {/* tapa */}
      <rect x="34" y="2" width="32" height="16" rx="3" fill="#161613" />
      <rect x="34" y="2" width="32" height="4" rx="2" fill="#2a2621" />
    </svg>
  );
}

/**
 * Miniatura de producto. Si hay foto real, se muestra tal cual (a color —
 * forzar B/N sobre una foto de celular la arruina). Sin foto: silueta de
 * frasco con degradado por acento, en vez de un ícono de línea — el frasco
 * tiene que ser protagonista visual incluso antes de tener fotos cargadas.
 *
 * accent: 'cream' (claro) | 'wine' | 'pine' (oscuros) — tiñe el vidrio y el
 * fondo detrás.
 */
export default function ProductThumb({ src, alt, accent = 'cream' }) {
  if (src) {
    return (
      <div className={s.wrap}>
        <img src={src} alt={alt} loading="lazy" className={s.img} />
      </div>
    );
  }
  return (
    <div className={`${s.wrap} ${s.placeholder} ${s[accent] || ''}`}>
      <Silueta accent={accent} />
    </div>
  );
}
