/*
  Íconos propios de la tienda. Trazo fino de 1,5 sobre grilla de 24,
  terminaciones y uniones redondeadas, sin rellenos salvo un punto mínimo.
  El peso visual de cada uno está centrado en (12, 12), medido con
  scripts de render (no a ojo).
  Cada ícono acepta { size = 20, strokeWidth = 1.5, className, ...props }.
*/

const FORMAS = {
  Bolsa: (
    <>
      <path d="M6 7.6h12l1.1 11.4a1.1 1.1 0 0 1-1.1 1.3H6a1.1 1.1 0 0 1-1.1-1.3z" />
      <path d="M9 7.6V6.3a3 3 0 0 1 6 0v1.3" />
    </>
  ),
  FlechaIzq: (
    <>
      <path d="M15 5.5 8.5 12l6.5 6.5" />
    </>
  ),
  FlechaDer: (
    <>
      <path d="M9 5.5 15.5 12 9 18.5" />
    </>
  ),
  FlechaArriba: (
    <>
      <path d="M12 21.5V6.6" />
      <path d="M6 12.1 12 6.1l6 6" />
    </>
  ),
  FlechaDiagonal: (
    <>
      <path d="M5 19 16 8" />
      <path d="M8 8h8v8" />
    </>
  ),
  Mas: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  Menos: (
    <>
      <path d="M5 12h14" />
    </>
  ),
  Tilde: (
    <>
      <path d="m5 11.7 4.5 4.5L19 6.7" />
    </>
  ),
  Cerrar: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  Compartir: (
    <>
      <path d="M12 14.5V2.8" />
      <path d="m8 6.3 4-3.5 4 3.5" />
      <path d="M8 9.5H6.2a1 1 0 0 0-1 1v8.1a1 1 0 0 0 1 1h11.6a1 1 0 0 0 1-1v-8.1a1 1 0 0 0-1-1H16" />
    </>
  ),
  WhatsApp: (
    <>
      <g transform="translate(.5 -.5)">
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.9L3.5 20.5l4.2-1.1A8.5 8.5 0 1 0 12 3.5z" />
      <path d="M9.4 8.3c.3-.3.8-.2 1 .2l.6 1.4c.1.3 0 .6-.2.8l-.5.5c.6 1.2 1.5 2.1 2.7 2.7l.5-.5c.2-.2.5-.3.8-.2l1.4.6c.4.2.5.7.2 1-.7.9-1.6 1.2-2.5.8-2.4-.9-4.2-2.7-5-5-.3-.9 0-1.7.9-2.5z" />
      </g>
    </>
  ),
  Instagram: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17" cy="7" r="0.7" fill="currentColor" stroke="none" />
    </>
  ),
  Catalogo: (
    <>
      <path d="M12 6.5C10 5 7 4.6 3.5 5v13c3.5-.4 6.5 0 8.5 1.5 2-1.5 5-1.9 8.5-1.5V5C17 4.6 14 5 12 6.5z" />
      <path d="M12 6.5v13" />
    </>
  ),
  Documento: (
    <>
      <path d="M6.5 3h8l4 4v13.2a.8.8 0 0 1-.8.8H6.5a.8.8 0 0 1-.8-.8V3.8A.8.8 0 0 1 6.5 3z" />
      <path d="M14.5 3v3.2a.8.8 0 0 0 .8.8h3.2" />
      <path d="M8.5 12.5h7" />
      <path d="M8.5 16h4.5" />
    </>
  ),
  Frasco: (
    <>
      <rect x="9.5" y="3" width="5" height="3.5" rx="0.9" />
      <path d="M10.5 6.5V9" />
      <path d="M13.5 6.5V9" />
      <rect x="6" y="9" width="12" height="12" rx="3.2" />
      <path d="M9.5 15h5" />
    </>
  ),
  Info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.9" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  Caja: (
    <>
      <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
}

function hacer(nombre, formas) {
  function Icono({ size = 20, strokeWidth = 1.5, className, ...props }) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {formas}
      </svg>
    )
  }
  Icono.displayName = nombre
  return Icono
}

export const Bolsa = /*#__PURE__*/ hacer('Bolsa', FORMAS.Bolsa)
export const FlechaIzq = /*#__PURE__*/ hacer('FlechaIzq', FORMAS.FlechaIzq)
export const FlechaDer = /*#__PURE__*/ hacer('FlechaDer', FORMAS.FlechaDer)
export const FlechaArriba = /*#__PURE__*/ hacer('FlechaArriba', FORMAS.FlechaArriba)
export const FlechaDiagonal = /*#__PURE__*/ hacer('FlechaDiagonal', FORMAS.FlechaDiagonal)
export const Mas = /*#__PURE__*/ hacer('Mas', FORMAS.Mas)
export const Menos = /*#__PURE__*/ hacer('Menos', FORMAS.Menos)
export const Tilde = /*#__PURE__*/ hacer('Tilde', FORMAS.Tilde)
export const Cerrar = /*#__PURE__*/ hacer('Cerrar', FORMAS.Cerrar)
export const Compartir = /*#__PURE__*/ hacer('Compartir', FORMAS.Compartir)
export const WhatsApp = /*#__PURE__*/ hacer('WhatsApp', FORMAS.WhatsApp)
export const Instagram = /*#__PURE__*/ hacer('Instagram', FORMAS.Instagram)
export const Catalogo = /*#__PURE__*/ hacer('Catalogo', FORMAS.Catalogo)
export const Documento = /*#__PURE__*/ hacer('Documento', FORMAS.Documento)
export const Frasco = /*#__PURE__*/ hacer('Frasco', FORMAS.Frasco)
export const Info = /*#__PURE__*/ hacer('Info', FORMAS.Info)
export const Caja = /*#__PURE__*/ hacer('Caja', FORMAS.Caja)
