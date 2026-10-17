import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { esPublicable, gruposPromoDe } from '../../lib/producto';
import { FAMILIAS } from '../../lib/familias';
import { conFiltro, esRebajado, leerFiltros, pasaFiltros, rebajadosAporta, tieneMinis } from '../../lib/filtros';
import { coincide, indexar, prepararConsulta } from '../../lib/busqueda';
import { linkWhatsApp } from '../../lib/whatsapp';
import { CATALOGO, LEGAL, conDatos } from '../../config/contenido';
import { DESTACADOS_MAXIMO, POR_PAGINA } from '../../config/ajustes';
import ProductCard from './ProductCard';
import Flecha from './Flecha';
import s from './ProductGrid.module.css';

/**
 * Tarjeta de espera, mientras la base no contesto. Mismo cuadro 3:4 y mas o
 * menos el mismo alto que una tarjeta de verdad, asi la grilla no salta cuando
 * llegan los aromas. Es tambien lo que trae el HTML pre-generado de /catalogo
 * (scripts/prerender.mjs).
 */
function Esqueleto() {
  return (
    <div className={s.esqueleto} aria-hidden="true">
      <span className={s.esqFoto} />
      <span className={s.esqCuerpo}>
        <span className={s.esqLinea} />
        <span className={`${s.esqLinea} ${s.esqCorta}`} />
        <span className={s.esqPie} />
      </span>
    </div>
  );
}

/** Filtros como pastillas que se prenden y apagan tocando la misma. */
function Pastilla({ activa, onClick, children, tono = '', qa }) {
  return (
    <button
      type="button"
      className={`${s.chip} ${tono} ${activa ? s.chipOn : ''}`}
      onClick={onClick}
      aria-pressed={activa}
      data-qa={qa}
    >
      {activa && <span className={s.tilde} aria-hidden="true">✓</span>}
      {children}
    </button>
  );
}

export default function ProductGrid({
  products, onOpen, onElegir, abiertoId, promos = {}, promoActiva, setPromoActiva, whatsapp = '', cargando = false,
}) {
  // Para, Familia y Minis viven en la direccion (lib/filtros.js): se pueden
  // compartir y sobreviven a abrir una ficha y volver "atras". Se cambian con
  // replace, para no llenar el historial de filtros.
  const [params, setParams] = useSearchParams();
  const filtros = leerFiltros(params);
  const { para, familia, minis } = filtros;
  const poner = (clave, valor) => setParams((prev) => conFiltro(prev, clave, valor), { replace: true });
  const [rebaja, setRebaja] = useState(false);
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(0);
  const tope = useRef(null);

  const publicables = useMemo(
    () => products.filter((p) => p.activo && esPublicable(p)),
    [products]
  );

  // El indice de busqueda se arma una vez por catalogo, no en cada tecla.
  const indices = useMemo(() => new Map(publicables.map((p) => [p.id, indexar(p)])), [publicables]);

  const visibles = useMemo(() => {
    const consulta = prepararConsulta(q);
    return publicables.filter((p) => {
      if (!pasaFiltros(p, { para, familia, minis })) return false;
      if (promoActiva && !gruposPromoDe(p).includes(promoActiva)) return false;
      if (rebaja && !esRebajado(p)) return false;
      return coincide(indices.get(p.id), consulta);
    });
  }, [publicables, indices, para, familia, minis, rebaja, q, promoActiva]);

  // "Rebajados" se ve solo si filtra algo (si cubre mas del 80 % no sirve) y
  // "Minis" solo si hay tamanos chicos en el ciclo.
  const conRebajados = useMemo(() => rebajadosAporta(publicables), [publicables]);
  const hayMinis = useMemo(() => publicables.some(tieneMinis), [publicables]);

  // Sin resultados: abajo del mensaje, los que mas salen, para no dejar a la
  // clienta frente a una pantalla vacia.
  const destacados = useMemo(
    () => publicables.filter((p) => p.destacado).slice(0, Math.min(DESTACADOS_MAXIMO, 4)),
    [publicables]
  );
  const buscado = q.trim();

  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const pagActual = Math.min(pagina, paginas - 1);
  const enPantalla = visibles.slice(pagActual * POR_PAGINA, (pagActual + 1) * POR_PAGINA);

  // Cambiar un filtro siempre devuelve a la primera pagina: si no, la clienta
  // filtra y le queda una pantalla vacia porque seguia parada en la pagina 4.
  useEffect(() => { setPagina(0); }, [para, familia, minis, rebaja, q, promoActiva]);

  const activos = [para, familia, promoActiva].filter(Boolean).length + (minis ? 1 : 0) + (rebaja ? 1 : 0);
  const limpiar = () => {
    setParams((prev) => ['para', 'familia', 'minis'].reduce((n, k) => conFiltro(n, k, null), prev), { replace: true });
    setRebaja(false); setPromoActiva(null); setQ('');
  };

  function irA(n) {
    setPagina(n);
    tope.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className={`tw ${s.section}`} id="catalogo">
      <header className={s.head} ref={tope}>
        <h2 className={s.titulo}>{CATALOGO.titulo}</h2>
        {/* Mientras carga, el numero de aromas tiene su lugar reservado (vacio):
            un numero inventado en el HTML pre-generado despues cambia. */}
        <p className={s.bajada}>
          {CATALOGO.bajada.split('{aromas}').map((parte, i) => (
            <span key={i}>
              {i > 0 && <span className={`${s.cifra} tnum`}>{cargando ? '' : publicables.length}</span>}
              {parte}
            </span>
          ))}
        </p>
        <p className={s.aviso}>{LEGAL.corto}</p>
      </header>

      {/* Barra de filtros: se pega abajo del encabezado al scrollear, así se
          puede cambiar de filtro sin volver arriba. */}
      <div className={`${s.barra} tglass`}>
        <input
          className={s.input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={CATALOGO.placeholderBusqueda}
          aria-label={CATALOGO.buscarEtiqueta}
        />

        {/* Dos renglones con rotulo: a quien y que familia. Las pastillas bajan
            de linea, nunca una tira que se corta (DISENO.md). El acento solo en
            la activa. La estacion (verano, invierno) salio de aca: "Verano"
            dejaba afuera los 42 de "todo el año", y "Frescos y citricos"
            contesta mejor la pregunta de que usar con calor. */}
        <div className={s.filtros}>
          <div className={s.renglon}>
            <span className={s.rotulo} id="filtro-para">{CATALOGO.filtros.para}</span>
            <div className={s.flujo}>
            <div className={s.chips} role="group" aria-labelledby="filtro-para" data-qa="filtro-para">
              <Pastilla activa={para === 'el'} onClick={() => poner('para', para === 'el' ? null : 'el')}>{CATALOGO.filtros.el}</Pastilla>
              <Pastilla activa={para === 'ella'} onClick={() => poner('para', para === 'ella' ? null : 'ella')}>{CATALOGO.filtros.ella}</Pastilla>
              <Pastilla activa={!para} onClick={() => poner('para', null)}>{CATALOGO.filtros.todos}</Pastilla>
            </div>
            {hayMinis && (
              <>
                <span className={s.corte} aria-hidden="true" />
                <Pastilla qa="filtro-minis" activa={minis} onClick={() => poner('minis', !minis)}>{CATALOGO.filtros.minis}</Pastilla>
              </>
            )}
            </div>
          </div>
          <div className={s.renglon}>
            <span className={s.rotulo} id="filtro-familia">{CATALOGO.filtros.familia}</span>
            <div className={s.chips} role="group" aria-labelledby="filtro-familia" data-qa="filtro-familia">
              {FAMILIAS.map((f) => (
                <Pastilla key={f.id} activa={familia === f.id} onClick={() => poner('familia', familia === f.id ? null : f.id)}>
                  {f.nombre}
                </Pastilla>
              ))}
            </div>
          </div>
          {(Object.keys(promos).length > 0 || conRebajados) && (
            <div className={s.renglon}>
              <span className={s.rotulo}>{CATALOGO.filtros.ademas}</span>
              <div className={s.chips}>
                {Object.values(promos).map((p) => (
                  <Pastilla
                    key={p.grupo}
                    tono={s.chipPromo}
                    activa={promoActiva === p.grupo}
                    onClick={() => setPromoActiva(promoActiva === p.grupo ? null : p.grupo)}
                  >
                    {p.grupo === 'arabe' ? CATALOGO.filtros.promoArabe : CATALOGO.filtros.promoDisenador}
                  </Pastilla>
                ))}
                {conRebajados && (
                  <Pastilla activa={rebaja} onClick={() => setRebaja(!rebaja)}>{CATALOGO.filtros.rebajados}</Pastilla>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={s.resumen}>
          <span className={`${s.conteo} tnum`} aria-live="polite">
            {cargando ? CATALOGO.cargando : (
              <>
                {visibles.length} {visibles.length === 1 ? 'aroma' : 'aromas'}
                {paginas > 1 ? ` · página ${pagActual + 1} de ${paginas}` : ''}
              </>
            )}
          </span>
          {activos > 0 && (
            <button type="button" className={s.limpiar} onClick={limpiar}>
              {CATALOGO.quitarFiltros} ({activos})
            </button>
          )}
        </div>
      </div>

      {cargando ? (
        <div className={s.grid} aria-busy="true">
          {Array.from({ length: POR_PAGINA }, (_, i) => <Esqueleto key={i} />)}
        </div>
      ) : visibles.length === 0 ? (
        <div className={s.vacio}>
          <p className={s.vacioTitulo}>{CATALOGO.vacioTitulo}</p>
          <p className={s.vacioTexto}>{CATALOGO.vacioTexto}</p>
          <div className={s.vacioAcciones}>
            {/* Lo principal es no perder a quien ya sabe lo que quiere: el
                WhatsApp sale con lo que busco escrito. */}
            {buscado && whatsapp && (
              <a
                className="tbtn"
                href={linkWhatsApp(whatsapp, conDatos(CATALOGO.vacioMensaje, { busqueda: buscado }))}
                target="_blank"
                rel="noopener"
              >
                {CATALOGO.vacioWhatsapp}
              </a>
            )}
            <button type="button" className="tbtn ghost" onClick={limpiar}>{CATALOGO.vacioBoton}</button>
          </div>
          {destacados.length > 0 && (
            <div className={s.vacioDestacados}>
              <h3 className={s.vacioSubtitulo}>{CATALOGO.vacioDestacados}</h3>
              <div className={s.grid}>
                {destacados.map((p) => (
                  <ProductCard key={p.id} producto={p} onOpen={onOpen} onElegir={onElegir} promos={promos} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className={s.grid}>
            {enPantalla.map((p) => (
              <ProductCard
                key={p.id}
                producto={p}
                onOpen={onOpen}
                onElegir={onElegir}
                promos={promos}
              />
            ))}
          </div>

          {paginas > 1 && (
            <nav className={s.paginador} aria-label="Páginas del catálogo">
              <button
                type="button"
                className={`${s.flecha} tglass-clear`}
                onClick={() => irA(pagActual - 1)}
                disabled={pagActual === 0}
                aria-label="Página anterior"
              >
                <Flecha atras />
              </button>

              <div className={s.numeros}>
                {Array.from({ length: paginas }, (_, i) => i)
                  .filter((i) => i === 0 || i === paginas - 1 || Math.abs(i - pagActual) <= 1)
                  .reduce((acc, i, idx, arr) => {
                    if (idx > 0 && i - arr[idx - 1] > 1) acc.push('...');
                    acc.push(i);
                    return acc;
                  }, [])
                  .map((i, idx) =>
                    i === '...' ? (
                      <span key={`s${idx}`} className={s.puntos}>…</span>
                    ) : (
                      <button
                        key={i}
                        type="button"
                        className={`${s.numero} ${i === pagActual ? s.numeroOn : 'tglass-clear'} tnum`}
                        onClick={() => irA(i)}
                        aria-current={i === pagActual ? 'page' : undefined}
                      >
                        {i + 1}
                      </button>
                    )
                  )}
              </div>

              <button
                type="button"
                className={`${s.flecha} tglass-clear`}
                onClick={() => irA(pagActual + 1)}
                disabled={pagActual === paginas - 1}
                aria-label="Página siguiente"
              >
                <Flecha />
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
