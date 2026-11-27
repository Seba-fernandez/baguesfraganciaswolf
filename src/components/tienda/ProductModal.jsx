import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../contexts/CartContext';
import useDialogo from '../../hooks/useDialogo';
import useBloqueoScroll from '../../hooks/useBloqueoScroll';
import {
  presentacionesActivas, presentacionPorDefecto, tituloDe, detalleLinea, fraseDe, piramideDe, ahorroDe,
} from '../../lib/producto';
import { pesos } from '../../lib/format';
import { copiarTexto, linkDeAroma } from '../../lib/compartir';
import { parecidos } from '../../lib/parecidos';
import { calcularCarrito, precioCadaUno } from '../../lib/promos';
import { disponibleDe } from '../../lib/mayorista.js';
import { fotoDe, fotoChica } from '../../lib/fotos';
import { FICHA, PARECIDOS, conDatos } from '../../config/contenido';
import ProductThumb from './ProductThumb';
import AvisoMayorista from './AvisoMayorista';
import { Mas, Menos } from './Iconos';
import s from './ProductModal.module.css';

/**
 * Ficha del aroma. Las presentaciones de las dos lineas conviven aca como
 * opciones: la de Bagues y la de Unlock del mismo perfume, con el nombre que
 * le pone cada proveedora en letra chica.
 *
 * En el celular va ordenada para decidir: foto contenida, nombre, una frase
 * corta, los tamanos con su precio y, recien despues, la piramide y la
 * descripcion para quien las quiera. La barra de agregar va al final del
 * marcado con position: sticky, asi queda pegada abajo de la hoja mientras se
 * baja y se apoya en su lugar al llegar al final. En escritorio se conserva el
 * orden que ya andaba (entra entera en 900 px), con `order` en el CSS.
 */
export default function ProductModal({
  producto, onClose, promos = {}, disparador = null, todos = [], onAbrir, previo = null, onVolver, mlInicial = null,
  whatsapp = '',
}) {
  const { addItem, cantidadDe } = useCart();
  const opciones = presentacionesActivas(producto);
  // El tamano con que arranca: el que se tenia elegido si se vuelve con la
  // flecha (y sigue en el ciclo); si no, el de siempre.
  const tamanoInicial = (p) => {
    const activas = presentacionesActivas(p);
    return (mlInicial != null && activas.some((x) => x.ml === mlInicial)) ? mlInicial : presentacionPorDefecto(p)?.ml ?? null;
  };
  const [ml, setMl] = useState(() => tamanoInicial(producto));
  const [cant, setCant] = useState(1);
  const hoja = useRef(null);
  const cerrarRef = useRef(null);
  const tituloRef = useRef(null);
  const copiarRef = useRef(null);
  const infoRef = useRef(null);
  const barraRef = useRef(null);
  // La descripcion larga, plegada hasta tocar "Ver mas" (las notas se ven siempre).
  const [masAbierto, setMasAbierto] = useState(false);
  // '' sin tocar, 'ok' copiado, 'manual' el navegador no dejo copiar.
  const [copia, setCopia] = useState('');
  const link = linkDeAroma(producto.slug);

  // Si cambia el aroma con la ficha abierta (un "mira tambien" o la flecha de
  // volver), se arranca de cero: tamano por defecto (o el que se tenia, al
  // volver), una unidad, notas plegadas y la hoja arriba de todo, asi la
  // flecha queda a la vista. En escritorio lo que se desplaza es la columna
  // del texto, por eso se suben las dos.
  const anterior = useRef(producto.id);
  useEffect(() => {
    if (anterior.current === producto.id) return;
    anterior.current = producto.id;
    setMl(tamanoInicial(producto));
    setCant(1);
    setCopia('');
    setMasAbierto(false);
    if (hoja.current) hoja.current.scrollTop = 0;
    if (infoRef.current) infoRef.current.scrollTop = 0;
    // Si el boton que se toco desaparecio (la flecha, al volver al primero),
    // el foco no se pierde: pasa al titulo.
    if (hoja.current && !hoja.current.contains(document.activeElement)) tituloRef.current?.focus({ preventScroll: true });
  }, [producto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compartir: en el telefono, el menu propio (WhatsApp, Instagram...); donde
  // no existe, o si falla, copia el link. Cancelar el menu no hace nada.
  async function compartir() {
    if (navigator.share) {
      try {
        await navigator.share({ title: tituloDe(producto), url: link });
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    const ok = await copiarTexto(link);
    copiarRef.current?.focus();
    setCopia(ok ? 'ok' : 'manual');
    if (ok) setTimeout(() => setCopia((c) => (c === 'ok' ? '' : c)), 2200);
  }

  // Foco adentro al abrir, Escape cierra y al cerrar vuelve a la tarjeta. El
  // foco inicial va al titulo y no al boton de cerrar: con un toque, el anillo
  // del boton se veia como un error (el titulo no lleva anillo, se lee igual).
  useDialogo({ abierto: true, onCerrar: onClose, refInicial: tituloRef, disparador });

  useBloqueoScroll();

  const elegida = opciones.find((p) => p.ml === ml) || null;
  const titulo = tituloDe(producto);
  const promo = elegida?.grupo_promo ? promos[elegida.grupo_promo] : null;
  const frase = fraseDe(producto);
  const piramide = piramideDe(producto);
  // "Ver mas" solo existe si hay algo que abrir: la descripcion larga.
  const hayMas = Boolean(producto.descripcion_larga);
  // El tope es por linea (aroma y tamano): lo que ya hay en el pedido cuenta.
  const enPedido = elegida ? cantidadDe(producto.id, elegida.ml) : 0;
  const disponible = disponibleDe(enPedido);
  // Lo que se esta eligiendo, nunca mas de lo que entra (si el pedido ya tiene
  // 18, la ficha deja elegir hasta 2).
  const cantEf = Math.min(cant, Math.max(1, disponible));
  const cantTotal = enPedido + (disponible > 0 ? cantEf : 0);
  const sugeridos = parecidos(producto, todos, 3);
  // Los costados de la foto en el celular: su propio borde, estirado a lo
  // ancho, asi el estudio sigue hasta el filo de la hoja (E3-B7).
  // El subtotal de la barra con el 2x1 del ciclo, el mismo motor que el
  // cajon: 6 de un perfume en 2x1 son 3 pares, no 6 precios (antes la barra
  // decia $ 185.994 y el cajon cobraba $ 92.997).
  const subtotal = elegida
    ? calcularCarrito([{ cantidad: cantEf, precio: elegida.precio, grupo_promo: elegida.grupo_promo }], Object.values(promos)).total
    : 0;
  const fondoFoto = fotoChica(producto.imagen_url || fotoDe(producto, elegida?.linea));

  // El alto real de la barra (crece con el aviso) va a la hoja como --alto-barra:
  // asi lo que se trae a la vista queda arriba de la barra y no debajo. Tambien
  // el hueco izquierdo de la columna (scrollbar-gutter: stable both-edges),
  // --g-izq, para que en escritorio la barra llegue hasta el borde de la foto.
  const hayBarra = Boolean(elegida);
  useEffect(() => {
    const el = barraRef.current;
    const raiz = hoja.current;
    if (!el || !raiz || typeof ResizeObserver === 'undefined') return undefined;
    const info = infoRef.current;
    // Cuando el aviso por cantidad entra, la barra crece de golpe (~150 px en
    // el celular): se ve un bloque vacio antes del fundido del aviso. FLIP: la
    // barra arranca corrida hacia abajo lo que crecio y sube a su lugar con la
    // curva de las hojas. ResizeObserver corre antes de pintar, asi que el
    // salto no llega a verse. Solo transform, solo al crecer.
    let altoPrevio = 0;
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const medir = () => {
      const alto = el.getBoundingClientRect().height;
      const crecio = alto - altoPrevio;
      if (altoPrevio && crecio > 24 && !quieto && el.animate) {
        el.animate([{ transform: `translateY(${crecio}px)` }, { transform: 'none' }],
          { duration: 450, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' });
      }
      altoPrevio = alto;
      raiz.style.setProperty('--alto-barra', `${Math.ceil(alto)}px`);
      if (info) raiz.style.setProperty('--g-izq', `${Math.max(0, (info.offsetWidth - info.clientWidth) / 2)}px`);
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (info) ro.observe(info);
    return () => { ro.disconnect(); raiz.style.removeProperty('--alto-barra'); raiz.style.removeProperty('--g-izq'); };
  }, [hayBarra]);

  /** La razon de cada sugerencia, a la vista. */
  const razon = (r) => (r.comparte.length
    ? conDatos(PARECIDOS.comparte, { notas: r.comparte.join(', ') })
    : conDatos(PARECIDOS.tambien, { algo: r.familia || PARECIDOS.para[r.producto.genero] || '' }));

  function sumar() {
    if (!elegida) return;
    if (disponible <= 0) return;
    addItem(producto, elegida, cantEf);
    onClose();
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div ref={hoja} className={s.sheet} role="dialog" aria-modal="true" aria-label={titulo} data-dialogo="ficha">
        <button ref={cerrarRef} className={s.cerrar} onClick={onClose} aria-label="Cerrar">✕</button>
        {copia === 'manual' && (
          <div className={s.linkManual}>
            <label htmlFor="ficha-link">{FICHA.linkManual}</label>
            <input id="ficha-link" readOnly value={link} onFocus={(e) => e.target.select()} autoFocus />
          </div>
        )}

        <div className={s.media} data-qa="ficha-media">
          {/* Sobre la foto: a la izquierda, volver al perfume de antes (solo si
              se llego desde un "Si te gusta este"); a la derecha, compartir. */}
          {previo && onVolver && (
            <button
              type="button"
              className={s.volver}
              onClick={onVolver}
              aria-label={conDatos(FICHA.volverA, { nombre: tituloDe(previo) })}
              data-qa="ficha-volver"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span className={s.volverNombre} aria-hidden="true">{tituloDe(previo)}</span>
            </button>
          )}
          <button ref={copiarRef} type="button" className={s.compartir} onClick={compartir} data-qa="ficha-compartir">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {copia === 'ok'
                ? <path d="M5 12.5l4.5 4.5L19 7.5" />
                : <><path d="M12 15V3" /><path d="m7.5 7.5 4.5-4.5 4.5 4.5" /><path d="M8 10.5H6.5A1.5 1.5 0 0 0 5 12v7.5A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V12a1.5 1.5 0 0 0-1.5-1.5H16" /></>}
            </svg>
            <span aria-live="polite">{copia === 'ok' ? FICHA.linkCopiado : FICHA.compartir}</span>
          </button>
          <ProductThumb
            producto={producto}
            ratio="3 / 4"
            linea={elegida?.linea}
            sizes="(max-width: 767px) 75vw, 640px"
            prioridad={2}
            previa
          />
          {/* Los costados en el celular. Las fotos del pipeline viven todas
              en la misma pared: a los costados va esa pared vacia, espejada,
              y sigue sin costura. Una foto subida a mano desde el panel no
              tiene esa pared: ahi se estira su propio borde, como antes. */}
          {fondoFoto && (
            producto.imagen_url ? (
              <>
                <span className={`${s.banda} ${s.bandaIzq}`} style={{ backgroundImage: `url(${fondoFoto})` }} aria-hidden="true" />
                <span className={`${s.banda} ${s.bandaDer}`} style={{ backgroundImage: `url(${fondoFoto})` }} aria-hidden="true" />
              </>
            ) : (
              <>
                <span className={`${s.banda} ${s.pared} ${s.bandaIzq}`} aria-hidden="true" />
                <span className={`${s.banda} ${s.pared} ${s.bandaDer}`} aria-hidden="true" />
              </>
            )
          )}
        </div>

        <div className={s.info} ref={infoRef}>
          {FICHA.para[producto.genero] && <p className={s.para}>{FICHA.para[producto.genero]}</p>}
          <h2 ref={tituloRef} tabIndex={-1} className={s.nombre}>{titulo}</h2>
          {frase && <p className={s.frase} data-qa="frase">{frase}</p>}
          <p className={s.inspirado}>{FICHA.inspirado}</p>

          {opciones.length > 0 ? (
            <div className={s.campo}>
              <span className="tlabel">{FICHA.tamano}</span>
              <div className={s.opciones} role="group" aria-label="Elegir presentación">
                {opciones.map((p) => {
                  const on = p.ml === ml;
                  return (
                    <button
                      key={`${p.ml}-${p.codigo}`}
                      type="button"
                      className={`${s.opcion} ${on ? s.opcionOn : ''}`}
                      aria-pressed={on}
                      onClick={() => { setMl(p.ml); setCant(1); }}
                    >
                      <span className={s.opIzq}>
                        <span className={`${s.opMl} tnum`}>{p.ml} ml</span>
                        <span className={s.opProv}>{detalleLinea(p, titulo)}</span>
                      </span>
                      <span className={`${s.opPrecio} tnum`}>
                        {ahorroDe(p) > 0 && <s className={s.opAntes}>{pesos(p.precio_anterior)}</s>}
                        <span data-qa="precio">{pesos(p.precio)}</span>
                        {ahorroDe(p) > 0 && (
                          <span className={s.opAhorro} data-qa="ahorro">{conDatos(FICHA.ahorras, { monto: pesos(ahorroDe(p)) })}</span>
                        )}
                      </span>
                      {p.grupo_promo && promos[p.grupo_promo] && <span className={s.opSello}>2x1</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className={s.desc}>{FICHA.sinCiclo}</p>
          )}

          {promo && (
            <p className={`${s.promoNota} tnum`}>
              {conDatos(FICHA.promoPares, { par: pesos(promo.precio_par), uno: pesos(precioCadaUno(promo.precio_par)) })}
            </p>
          )}

          {/* Familia y notas como el elenco de una serie: rotulo en negrita y
              los datos seguidos, sin pastillas (no se tocan, no son botones).
              Las dos se ven siempre; "Ver mas" abre solo la descripcion larga
              y existe solo si el perfume la tiene. */}
          {(producto.familia_olfativa || piramide.length > 0 || producto.descripcion_larga) && (
            <div className={s.ficha}>
              {/* La familia y, a su lado, "Ver mas": en un renglon, asi el
                  boton no suma alto. */}
              <div className={s.familiaFila}>
                {producto.familia_olfativa && (
                  <dl className={s.lineas}>
                    <div className={s.linea}>
                      <dt>{FICHA.familia}</dt>
                      <dd>{producto.familia_olfativa}</dd>
                    </div>
                  </dl>
                )}
                {hayMas && (
                  <button
                    type="button"
                    className={s.verMas}
                    onClick={() => setMasAbierto((v) => !v)}
                    aria-expanded={masAbierto}
                    data-qa="ficha-ver-mas"
                  >
                    {masAbierto ? FICHA.verMenos : FICHA.verMas}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              {piramide.length > 0 && (
                <dl className={s.lineas} data-qa="piramide">
                  {piramide.map((f) => (
                    <div key={f.etapa} className={s.linea}>
                      <dt data-qa="etapa">{f.etapa}</dt>
                      <dd>{f.notas.map((n, i) => <span key={n} data-qa="nota">{i ? ', ' : ''}{n}</span>)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {/* Solo se dibuja abierta: aparece con opacidad y 6 px de
                  movimiento, y el alto cambia de golpe una vez (sin animar
                  height). Cerrada no existe: el teclado no entra. */}
              {hayMas && masAbierto && (
                <p className={`${s.desc} ${s.masAbierto}`} data-qa="ficha-mas">{producto.descripcion_larga}</p>
              )}
            </div>
          )}

          {onAbrir && sugeridos.length > 0 && (
            <section className={s.parecidos} aria-labelledby="parecidos-titulo">
              <h3 id="parecidos-titulo" className={s.parecidosTitulo}>{PARECIDOS.titulo}</h3>
              <div className={s.parecidosFila}>
                {sugeridos.map((r) => (
                  <button key={r.producto.id} type="button" className={s.parecido} onClick={() => onAbrir(r.producto, { desdeMl: ml })} data-qa="parecido">
                    {/* alt vacio: el nombre va al lado; si no, el lector lo dice dos veces. */}
                    <ProductThumb producto={r.producto} ratio="3 / 4" sizes="(max-width: 767px) 30vw, 130px" alt="" />
                    <span className={s.parecidoNombre}>{tituloDe(r.producto)}</span>
                    <span className={s.parecidoRazon}>{razon(r)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {elegida && (
            <div className={s.barra} ref={barraRef}>
              {/* Arriba de la barra y adentro de ella: queda a la vista mientras
                  se elige la cantidad, y no tapa ni el boton ni el total. */}
              <AvisoMayorista
                clave={`${producto.id}::${elegida.ml}`}
                cantidad={cantTotal}
                nombre={titulo}
                ml={elegida.ml}
                whatsapp={whatsapp}
                className={s.avisoBarra}
                fijoEnTope
              />
              <div className={s.barraFila}>
                <span className={`${s.resumen} tnum`}>
                  <span className={s.resumenMl}>{elegida.ml} ml</span>
                  <span className={s.resumenPrecio}>{disponible > 0 ? pesos(subtotal) : FICHA.enElMaximo}</span>
                </span>
                <div className={s.stepper} role="group" aria-label="Cantidad">
                  <button
                    type="button"
                    onClick={() => { if (cantEf > 1) setCant(cantEf - 1); }}
                    aria-disabled={cantEf <= 1 ? 'true' : undefined}
                    aria-label={FICHA.restar}
                  ><Menos size={18} /></button>
                  <span className="tnum" aria-live="polite">{cantEf}</span>
                  <button
                    type="button"
                    onClick={() => { if (cantEf < disponible) setCant(cantEf + 1); }}
                    aria-disabled={cantEf >= disponible ? 'true' : undefined}
                    aria-label={FICHA.sumar}
                  ><Mas size={18} /></button>
                </div>
                <button type="button" className={`tbtn ${s.agregar}`} onClick={sumar} disabled={disponible <= 0} data-qa="agregar-ficha">
                  <span>{FICHA.agregarCorto}<span className={s.agregarResto}>{FICHA.agregarResto}</span></span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
