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
export default function ProductModal({ producto, onClose, promos = {}, disparador = null, todos = [], onAbrir }) {
  const { addItem } = useCart();
  const opciones = presentacionesActivas(producto);
  const [ml, setMl] = useState(() => presentacionPorDefecto(producto)?.ml ?? null);
  const [cant, setCant] = useState(1);
  const hoja = useRef(null);
  const cerrarRef = useRef(null);
  const copiarRef = useRef(null);
  // '' sin tocar, 'ok' copiado, 'manual' el navegador no dejo copiar.
  const [copia, setCopia] = useState('');
  const link = linkDeAroma(producto.slug);

  // Si cambia el aroma con la ficha abierta (un "mira tambien"), se arranca de
  // cero: tamano por defecto, una unidad y la hoja arriba de todo.
  const anterior = useRef(producto.id);
  useEffect(() => {
    if (anterior.current === producto.id) return;
    anterior.current = producto.id;
    setMl(presentacionPorDefecto(producto)?.ml ?? null);
    setCant(1);
    setCopia('');
    if (hoja.current) hoja.current.scrollTop = 0;
  }, [producto]);

  async function copiarLink() {
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
        <button ref={copiarRef} type="button" className={s.copiar} onClick={copiarLink}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {copia === 'ok'
              ? <path d="M5 12.5l4.5 4.5L19 7.5" />
              : <><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" /><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></>}
          </svg>
          <span aria-live="polite">{copia === 'ok' ? FICHA.linkCopiado : FICHA.copiarLink}</span>
        </button>
        {copia === 'manual' && (
          <div className={s.linkManual}>
            <label htmlFor="ficha-link">{FICHA.linkManual}</label>
            <input id="ficha-link" readOnly value={link} onFocus={(e) => e.target.select()} autoFocus />
          </div>
        )}

        <div className={s.media} data-qa="ficha-media">
          <ProductThumb
            producto={producto}
            ratio="3 / 4"
            linea={elegida?.linea}
            sizes="(max-width: 767px) 75vw, 640px"
          />
          {fondoFoto && (
            <>
              <span className={`${s.banda} ${s.bandaIzq}`} style={{ backgroundImage: `url(${fondoFoto})` }} aria-hidden="true" />
              <span className={`${s.banda} ${s.bandaDer}`} style={{ backgroundImage: `url(${fondoFoto})` }} aria-hidden="true" />
            </>
          )}
        </div>

        <div className={s.info}>
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
                        {p.codigo && <span className={`${s.opCodigo} tnum`} data-qa="codigo">{FICHA.codigo} {p.codigo}</span>}
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

          {elegida && FICHA.verificar[elegida.linea] && (
            <p className={s.verificar} data-qa="verificar">
              {FICHA.verificar[elegida.linea].texto}
              <a href={FICHA.verificar[elegida.linea].url} target="_blank" rel="noopener noreferrer">
                {FICHA.verificar[elegida.linea].sitio}
              </a>.
            </p>
          )}

          {promo && (
            <p className={`${s.promoNota} tnum`}>
              Llevando de a pares: {pesos(promo.precio_par)} el par, {pesos(Math.round(promo.precio_par / 2))} cada uno.
            </p>
          )}

          {piramide.length > 0 && (
            <div className={s.piramide} data-qa="piramide">
              {piramide.map((f) => (
                <div key={f.etapa} className={s.nota}>
                  <span className={s.notaEtapa} data-qa="etapa">{f.etapa}</span>
                  <ul className={s.pastillas}>
                    {f.notas.map((n) => <li key={n} className={s.pastilla} data-qa="nota">{n}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {producto.descripcion_larga && <p className={s.desc}>{producto.descripcion_larga}</p>}

          {onAbrir && sugeridos.length > 0 && (
            <section className={s.parecidos} aria-labelledby="parecidos-titulo">
              <h3 id="parecidos-titulo" className={s.parecidosTitulo}>{PARECIDOS.titulo}</h3>
              <div className={s.parecidosFila}>
                {sugeridos.map((r) => (
                  <button key={r.producto.id} type="button" className={s.parecido} onClick={() => onAbrir(r.producto)} data-qa="parecido">
                    {/* alt vacio: el nombre va al lado; si no, el lector lo dice dos veces. */}
                    <ProductThumb producto={r.producto} ratio="3 / 4" sizes="(max-width: 767px) 30vw, 130px" alt="" />
                    <span className={s.parecidoNombre}>{tituloDe(r.producto)}</span>
                    <span className={s.parecidoRazon}>{razon(r)}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <p className={s.aviso}>{FICHA.aviso}</p>

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
