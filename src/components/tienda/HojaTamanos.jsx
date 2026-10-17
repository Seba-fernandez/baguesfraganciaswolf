import { useRef, useState } from 'react';
import useDialogo from '../../hooks/useDialogo';
import useBloqueoScroll from '../../hooks/useBloqueoScroll';
import { presentacionesActivas, presentacionPorDefecto, tituloDe, detalleLinea, ahorroDe } from '../../lib/producto';
import { pesos } from '../../lib/format';
import { HOJA_TAMANOS, conDatos } from '../../config/contenido';
import s from './HojaTamanos.module.css';

/**
 * La hoja chica que abre el + de una tarjeta cuando el aroma tiene mas de un
 * tamano. Antes las pastillas de tamano vivian en la tarjeta: en el celular se
 * apretaban tres por fila con el precio tachado y dejaban tarjetas de alturas
 * distintas. Aca cada tamano es una fila grande (ml, linea, precio) y abajo un
 * solo boton.
 *
 * Es un dialogo como la ficha y el cajon: va fuera de <main> (si no, el pie se
 * pinta encima), con el foco adentro, Escape y "atras" la cierran (TiendaShell
 * la abre con una entrada propia en el historial). En el celular sube desde
 * abajo; en escritorio es una placa chica centrada.
 */
export default function HojaTamanos({ producto, onClose, onAgregar, onVerFicha, promos = {}, disparador = null }) {
  const opciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const cerrarRef = useRef(null);
  const titulo = tituloDe(producto);
  const elegida = opciones.find((p) => p.ml === ml) || opciones[0] || null;

  useDialogo({ abierto: true, onCerrar: onClose, refInicial: cerrarRef, disparador });
  useBloqueoScroll();

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div
        className={s.hoja}
        role="dialog"
        aria-modal="true"
        aria-label={conDatos(HOJA_TAMANOS.etiqueta, { nombre: titulo })}
        data-dialogo="tamanos"
      >
        <div className={s.head}>
          <div className={s.headTexto}>
            <p className={s.eyebrow}>{HOJA_TAMANOS.titulo}</p>
            <h2 className={s.nombre}>{titulo}</h2>
          </div>
          <button ref={cerrarRef} type="button" className={s.cerrar} onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        <div className={s.filas} role="group" aria-label="Elegir tamaño">
          {opciones.map((p) => {
            const on = p.ml === elegida?.ml;
            return (
              <button
                key={`${p.ml}-${p.codigo}`}
                type="button"
                className={`${s.fila} ${on ? s.filaOn : ''}`}
                aria-pressed={on}
                onClick={() => setMl(p.ml)}
                data-qa="fila-tamano"
              >
                <span className={s.izq}>
                  <span className={`${s.ml} tnum`}>{p.ml} ml</span>
                  <span className={s.linea}>{detalleLinea(p, titulo)}</span>
                </span>
                <span className={`${s.der} tnum`}>
                  {ahorroDe(p) > 0 && <s className={s.antes}>{pesos(p.precio_anterior)}</s>}
                  <span className={s.precio}>{pesos(p.precio)}</span>
                </span>
                {p.grupo_promo && promos[p.grupo_promo] && <span className={s.sello}>2x1</span>}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="tbtn wide"
          onClick={() => elegida && onAgregar(elegida)}
          disabled={!elegida}
          data-qa="agregar-hoja"
        >
          {conDatos(HOJA_TAMANOS.agregar, { ml: elegida?.ml ?? '' })}
        </button>
        <button type="button" className={s.verFicha} onClick={onVerFicha}>{HOJA_TAMANOS.verFicha}</button>
      </div>
    </>
  );
}
