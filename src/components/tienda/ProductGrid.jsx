import { useEffect, useMemo, useRef, useState } from 'react';
import { GENEROS } from '../../data/constants';
import { esPublicable, gruposPromoDe } from '../../lib/producto';
import { coincide, indexar, prepararConsulta } from '../../lib/busqueda';
import { linkWhatsApp } from '../../lib/whatsapp';
import { CATALOGO, LEGAL, conDatos } from '../../config/contenido';
import { DESTACADOS_MAXIMO, POR_PAGINA } from '../../config/ajustes';
import ProductCard from './ProductCard';
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
function Pastilla({ activa, onClick, children, tono = '' }) {
  return (
    <button
      type="button"
      className={`${s.chip} ${tono} ${activa ? s.chipOn : ''}`}
      onClick={onClick}
      aria-pressed={activa}
    >
      {activa && <span className={s.tilde} aria-hidden="true">✓</span>}
      {children}
    </button>
  );
}

export default function ProductGrid({
  products, onOpen, abiertoId, promos = {}, promoActiva, setPromoActiva, whatsapp = '', cargando = false,
}) {
  const [genero, setGenero] = useState(null);   // null = sin filtrar
  const [momento, setMomento] = useState(null);
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
      if (genero && p.genero !== genero) return false;
      if (momento && p.momento !== momento) return false;
      if (promoActiva && !gruposPromoDe(p).includes(promoActiva)) return false;
      if (rebaja && !(p.presentaciones || []).some((x) => x.precio_anterior)) return false;
      return coincide(indices.get(p.id), consulta);
    });
  }, [publicables, indices, genero, momento, rebaja, q, promoActiva]);

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
  useEffect(() => { setPagina(0); }, [genero, momento, rebaja, q, promoActiva]);

  const activos = [genero, momento, promoActiva].filter(Boolean).length + (rebaja ? 1 : 0);
  const limpiar = () => { setGenero(null); setMomento(null); setRebaja(false); setPromoActiva(null); setQ(''); };

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

        <div className={`${s.chips} tscroll-x`} role="group" aria-label="Filtrar el catálogo">
          {Object.values(GENEROS).map((g) => (
            <Pastilla key={g.id} activa={genero === g.id} onClick={() => setGenero(genero === g.id ? null : g.id)}>
              {g.label}
            </Pastilla>
          ))}

          <span className={s.corte} aria-hidden="true" />

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

          <Pastilla tono={s.chipPromo} activa={rebaja} onClick={() => setRebaja(!rebaja)}>
            {CATALOGO.filtros.rebajados}
          </Pastilla>

          <span className={s.corte} aria-hidden="true" />

          <Pastilla activa={momento === 'verano'} onClick={() => setMomento(momento === 'verano' ? null : 'verano')}>
            {CATALOGO.filtros.verano}
          </Pastilla>
          <Pastilla activa={momento === 'invierno'} onClick={() => setMomento(momento === 'invierno' ? null : 'invierno')}>
            {CATALOGO.filtros.invierno}
          </Pastilla>
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
                  <ProductCard key={p.id} producto={p} onOpen={onOpen} promos={promos} />
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
                ←
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
                →
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
