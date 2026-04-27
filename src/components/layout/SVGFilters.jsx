/**
 * SVGFilters
 *
 * Filtros SVG globales para el efecto Liquid Glass.
 * Se monta UNA sola vez en el Layout (en el root) y los componentes
 * .glass los referencian via `backdrop-filter: url(#vajilla-glass-displace)`.
 *
 * Técnica:
 * - feTurbulence genera ruido (textura random tipo agua)
 * - feDisplacementMap usa ese ruido para distorsionar el contenido detrás
 * - El resultado es la "lente mojada" / refracción real
 *
 * Notas:
 * - Safari NO soporta backdrop-filter: url() — el fallback CSS @supports lo cubre
 * - Mantenemos el displacement leve (scale 6) para que no se rompa en cards chicas
 */

export default function SVGFilters() {
  return (
    <svg
      aria-hidden="true"
      style={{
        position: 'absolute',
        width: 0,
        height: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <defs>
        {/* Filtro suave (default — para todas las superficies glass) */}
        <filter id="vajilla-glass-displace" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.012 0.012"
            numOctaves="2"
            seed="7"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="1.2" result="softTurb" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softTurb"
            scale="6"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>

        {/* Filtro fuerte (para sheets / hero — más distorsión) */}
        <filter id="vajilla-glass-displace-strong" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.008 0.008"
            numOctaves="2"
            seed="3"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="1.5" result="softTurb" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="softTurb"
            scale="10"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  );
}
