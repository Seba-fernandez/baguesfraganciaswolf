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
import { fotoDe, fotoChica } from '../../lib/fotos';
import { FICHA, PARECIDOS, conDatos } from '../../config/contenido';
import { CANTIDAD_MAXIMA } from '../../config/ajustes';
import ProductThumb from './ProductThumb';
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
}) {
  const { addItem } = useCart();
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
  const copiarRef = useRef(null);
  const infoRef = useRef(null);
  // Las notas y la descripcion, plegadas hasta tocar "Ver mas".
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
    // el foco no se pierde: pasa al cerrar.
    if (hoja.current && !hoja.current.contains(document.activeElement)) cerrarRef.current?.focus({ preventScroll: true });
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

  // Foco adentro al abrir, Escape cierra y al cerrar vuelve a la tarjeta.
  useDialogo({ abierto: true, onCerrar: onClose, refInicial: cerrarRef, disparador });

  useBloqueoScroll();

  const elegida = opciones.find((p) => p.ml === ml) || null;
  const titulo = tituloDe(producto);
  const promo = elegida?.grupo_promo ? promos[elegida.grupo_promo] : null;
  const frase = fraseDe(producto);
  const piramide = piramideDe(producto);
  const hayMas = piramide.length > 0 || Boolean(producto.descripcion_larga);
  const sugeridos = parecidos(producto, todos, 3);
  // Los costados de la foto en el celular: su propio borde, estirado a lo
  // ancho, asi el estudio sigue hasta el filo de la hoja (E3-B7).
  const fondoFoto = fotoChica(producto.imagen_url || fotoDe(producto, elegida?.linea));

  /** La razon de cada sugerencia, a la vista. */
  const razon = (r) => (r.comparte.length
    ? conDatos(PARECIDOS.comparte, { notas: r.comparte.join(', ') })
    : conDatos(PARECIDOS.tambien, { algo: r.familia || PARECIDOS.para[r.producto.genero] || '' }));

  function sumar() {
    if (!elegida) return;
    addItem(producto, elegida, cant);
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
          <h2 className={s.nombre}>{titulo}</h2>
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
                      onClick={() => setMl(p.ml)}
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
              Llevando de a pares: {pesos(promo.precio_par)} el par, {pesos(Math.round(promo.precio_par / 2))} cada uno.
            </p>
          )}

          {/* Familia y notas como el elenco de una serie: rotulo en negrita y
              los datos seguidos, sin pastillas (no se tocan, no son botones).
              La familia queda a la vista; las notas y la descripcion se
              pliegan detras de "Ver mas" (Sebas, 23/10), asi los parecidos
              suben unos 240 px: en escritorio entran sin bajar. Plegadas
              siguen en la pagina (inert, para que el teclado no entre). */}
          {(producto.familia_olfativa || piramide.length > 0 || producto.descripcion_larga) && (
            <div className={s.ficha}>
              {/* La familia y, a su lado, "Ver mas": en un renglon, asi el
                  boton no suma alto (medido: con los dos tamanos de Kenzo, los
                  parecidos quedaban 75 px debajo de la barra en escritorio). */}
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
                    aria-controls="ficha-mas"
                    data-qa="ficha-ver-mas"
                  >
                    {masAbierto ? FICHA.verMenos : FICHA.verMas}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              {hayMas && (
                <div
                  id="ficha-mas"
                  className={`${s.plegable} ${masAbierto ? s.plegableAbierto : ''}`}
                  inert={masAbierto ? undefined : ''}
                  data-qa="ficha-mas"
                >
                  <div className={s.plegableDentro}>
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
                    {producto.descripcion_larga && <p className={s.desc}>{producto.descripcion_larga}</p>}
                  </div>
                </div>
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
            <div className={s.barra}>
              <span className={`${s.resumen} tnum`}>
                <span className={s.resumenMl}>{elegida.ml} ml</span>
                <span className={s.resumenPrecio}>{pesos(elegida.precio * cant)}</span>
              </span>
              <div className={s.stepper} role="group" aria-label="Cantidad">
                <button type="button" onClick={() => setCant((c) => Math.max(1, c - 1))} aria-label="Restar">-</button>
                <span className="tnum" aria-live="polite">{cant}</span>
                <button type="button" onClick={() => setCant((c) => Math.min(CANTIDAD_MAXIMA, c + 1))} aria-label="Sumar">+</button>
              </div>
              <button type="button" className={`tbtn ${s.agregar}`} onClick={sumar} data-qa="agregar-ficha">
                <span>{FICHA.agregarCorto}<span className={s.agregarResto}>{FICHA.agregarResto}</span></span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
