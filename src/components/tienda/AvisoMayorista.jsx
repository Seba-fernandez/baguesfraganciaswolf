import { useEffect, useRef, useState } from 'react';
import { AVISO_MAYORISTA as T, conDatos } from '../../config/contenido';
import { CANTIDAD_MAXIMA } from '../../config/ajustes';
import { linkWhatsApp } from '../../lib/whatsapp';
import { Caja, Cerrar } from './Iconos';
import { nivelAviso, avisoCerrado, cerrarAviso } from '../../lib/mayorista.js';
import s from './AvisoMayorista.module.css';

/**
 * El aviso de compra por cantidad: aparece desde MAYORISTA_DESDE unidades de
 * un mismo perfume y manda a WhatsApp por el precio por mayor. Al llegar a
 * CANTIDAD_MAXIMA cambia al aviso de tope. No bloquea nada.
 *
 * Se cierra con la cruz o, en el celular, arrastrandolo hacia un costado (hacia
 * abajo no: el dedo que baja es el que hace scroll). Si no se lo lleva lo
 * bastante lejos, vuelve a su lugar. Cerrado, no vuelve a salir para esa linea
 * en la sesion (el de tope es otro nivel: sale igual al llegar al maximo).
 * Con fijoEnTope (la ficha), el de tope no se cierra: es la unica explicacion
 * de por que "Agregar" esta apagado.
 *
 * Props: `clave` identifica la linea (producto + tamano), `cantidad` son las
 * unidades que lleva (en la ficha, las del pedido mas las que se estan
 * eligiendo), `nombre` y `ml` arman el mensaje, `whatsapp` es el numero.
 */

// Cuanto hay que arrastrar para que se vaya, en px.
const UMBRAL_LADO = 72;
const SALIDA_MS = 280;

// Las vibraciones ya dadas: una sola vez por linea y nivel, aunque el aviso se
// vuelva a dibujar (por ejemplo, al reabrir el cajon).
const vibrados = new Set();

const quietoPorPedido = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; }
};

export default function AvisoMayorista({ clave, cantidad, nombre, ml, whatsapp, className = '', fijoEnTope = false }) {
  const nivel = nivelAviso(cantidad);
  const cerrable = !(fijoEnTope && nivel === 'tope');
  // Lo cerrado en esta sesion queda en sessionStorage; esto cubre el caso en que
  // el navegador no deje usarlo (el aviso igual se va, solo vuelve a salir al
  // recargar).
  const [ocultoAca, setOcultoAca] = useState('');
  const caja = useRef(null);
  const arrastre = useRef(null);
  const salida = useRef(0);
  // La cantidad de antes, para vibrar solo cuando la linea CRUZA el umbral.
  const previa = useRef({ clave, cantidad });
  const visible = Boolean(nivel) && (!cerrable || (!avisoCerrado(clave, nivel) && ocultoAca !== `${clave}:${nivel}`));

  // Si se desmonta con la salida a medias, el temporizador no queda suelto.
  useEffect(() => () => window.clearTimeout(salida.current), []);

  // Un toque corto al aparecer, solo en los telefonos que lo permiten y solo si
  // la persona ya toco la pagina (si no, el navegador lo ignora o se queja).
  useEffect(() => {
    const antes = previa.current.clave === clave ? previa.current.cantidad : cantidad;
    previa.current = { clave, cantidad };
    if (!visible) return;
    // Abrir la ficha o el cajon con una linea que ya pasaba el umbral no vibra.
    if (nivelAviso(antes) === nivel) return;
    const marca = `${clave}:${nivel}`;
    if (vibrados.has(marca)) return;
    vibrados.add(marca);
    try {
      if (navigator.userActivation?.hasBeenActive && !quietoPorPedido()) navigator.vibrate?.(12);
    } catch { /* sin vibracion: no pasa nada */ }
  }, [visible, clave, nivel, cantidad]);

  function irse(x, y) {
    const el = caja.current;
    const quieto = quietoPorPedido();
    if (el && !quieto) {
      el.style.transition = `transform ${SALIDA_MS}ms var(--hoja), opacity ${SALIDA_MS}ms var(--hoja)`;
      el.style.transform = `translate(${x}px, ${y}px)`;
      el.style.opacity = '0';
    }
    window.clearTimeout(salida.current);
    salida.current = window.setTimeout(() => { cerrarAviso(clave, nivel); setOcultoAca(`${clave}:${nivel}`); }, quieto ? 0 : SALIDA_MS);
  }

  function alApoyar(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('a, button')) return;
    arrastre.current = { x: e.clientX, dx: 0 };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // La animacion de entrada (0,45 s) pisaria el transform del arrastre.
    e.currentTarget.style.animation = 'none';
    e.currentTarget.style.transition = 'none';
  }

  function alMover(e) {
    const a = arrastre.current;
    if (!a) return;
    a.dx = e.clientX - a.x; // solo hacia los costados
    const el = e.currentTarget;
    el.style.transform = `translateX(${a.dx}px)`;
    el.style.opacity = String(Math.max(0.35, 1 - Math.abs(a.dx) / 260));
  }

  function alSoltar(e) {
    const a = arrastre.current;
    arrastre.current = null;
    if (!a) return;
    // Un pointercancel (el navegador se quedo con el gesto) nunca cierra.
    if (e.type !== 'pointercancel' && Math.abs(a.dx) > UMBRAL_LADO) {
      // Sigue para el lado que iba, desde donde esta (sin salto).
      irse(Math.sign(a.dx) * Math.max(160, Math.abs(a.dx) + 80), 0);
      return;
    }
    // No llego al umbral: vuelve a su lugar con el mismo rebote suave del resto.
    const el = e.currentTarget;
    el.style.transition = 'transform var(--soltar-dur) var(--soltar), opacity var(--dur) var(--ease)';
    el.style.transform = '';
    el.style.opacity = '';
  }

  const tope = nivel === 'tope';
  const datos = { nombre, ml, maximo: CANTIDAD_MAXIMA };
  const link = whatsapp ? linkWhatsApp(whatsapp, conDatos(tope ? T.mensajeTope : T.mensaje, datos)) : null;

  return (
    // La region viva existe siempre (vacia, no mide nada): un lector de
    // pantalla anuncia lo que aparece adentro de una region que ya estaba.
    <div className={s.vivo}>
      {/* La region viva existe siempre y es solo texto (titulo y bajada): un
          lector de pantalla anuncia lo que aparece adentro de una region que
          ya estaba. El link y la cruz quedan afuera, en la tarjeta. */}
      <p className={s.soloLector} role="status" aria-live="polite">
        {visible ? `${tope ? T.tituloTope : T.titulo}. ${conDatos(tope ? T.bajadaTope : T.bajada, datos)}` : ''}
      </p>
      {visible && (
        <div
          key={`${clave}:${nivel}`}
          ref={caja}
          role="group"
          aria-label={T.etiqueta}
          className={`${s.aviso} ${tope ? s.tope : ''} ${cerrable ? s.arrastrable : ''} ${className}`}
          {...(cerrable ? { onPointerDown: alApoyar, onPointerMove: alMover, onPointerUp: alSoltar, onPointerCancel: alSoltar } : {})}
          data-qa="aviso-mayorista"
          data-nivel={nivel}
        >
          <span className={s.icono} aria-hidden="true" data-icono="caja">
            <Caja size={22} />
          </span>
          <div className={s.texto}>
            <p className={s.titulo} aria-hidden="true">{tope ? T.tituloTope : T.titulo}</p>
            <p className={s.bajada} aria-hidden="true">{conDatos(tope ? T.bajadaTope : T.bajada, datos)}</p>
            {link && (
              <a className={s.boton} href={link} target="_blank" rel="noopener noreferrer">
                {tope ? T.botonTope : T.boton}
              </a>
            )}
          </div>
          {cerrable && (
            <button type="button" className={s.cerrar} onClick={() => irse(0, 60)} aria-label={T.cerrar}>
              <Cerrar size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
