import { useEffect, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import { AVISO_AGREGADO, conDatos } from '../../config/contenido';
import s from './AvisoAgregado.module.css';

const DURACION = 4000;

/**
 * La barra que sube abajo cuando se agrega un aroma y el cajon NO se abre
 * (desde el segundo agregado de la sesion, ver CartContext): "Sauvage 50 ml ·
 * Bagues, caja Arizona · Ver pedido (2)". La clienta sigue en su lugar del
 * catalogo y sabe que entro, y de que linea.
 *
 * Se va sola a los 4 s o al tocar "Ver pedido". Es una region viva (status):
 * el lector de pantalla lo anuncia sin mover el foco. Va fuera de <main>, al
 * lado del cajon, asi el pie no se le pinta encima.
 */
export default function AvisoAgregado({ onVisible }) {
  const { ultimo, count, open, setOpen } = useCart();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ultimo || ultimo.abrioCajon) return undefined;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), DURACION);
    return () => clearTimeout(t);
  }, [ultimo]);

  // Con el cajon abierto la barra no tiene sentido.
  useEffect(() => { if (open) setVisible(false); }, [open]);
  useEffect(() => { onVisible?.(visible); }, [visible, onVisible]);

  const mostrar = visible && ultimo;
  return (
    <div className={`${s.aviso} ${mostrar ? s.visible : ''}`} role="status" data-qa="aviso-agregado">
      {mostrar && (
        <>
          <svg className={s.tilde} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <p className={s.texto}>
            <span className={s.oculto}>{AVISO_AGREGADO.agregado} </span>
            <strong className={s.nombre}>{ultimo.nombre}</strong>
            <span className="tnum"> {ultimo.ml} ml</span>
            <span className={s.detalle}> · {ultimo.detalle}</span>
          </p>
          <button type="button" className={s.ver} onClick={() => { setVisible(false); setOpen(true); }}>
            {conDatos(AVISO_AGREGADO.verPedido, { n: count })}
          </button>
        </>
      )}
    </div>
  );
}
