/**
 * La flecha de los botones, dibujada. Era el caracter "→", que no esta en el
 * subconjunto de Figtree: el navegador lo sacaba de una fuente del sistema,
 * distinta en cada telefono, y el boton cambiaba de ancho al llegar la fuente.
 */
export default function Flecha({ atras = false }) {
  return (
    <svg
      width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      style={{ display: 'block', flexShrink: 0, transform: atras ? 'scaleX(-1)' : undefined }}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
