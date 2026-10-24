import { useMemo, useRef } from 'react';
import { useCart } from '../../contexts/CartContext';
import useDialogo from '../../hooks/useDialogo';
import useBloqueoScroll from '../../hooks/useBloqueoScroll';
import { FAMILIAS, familiaDe } from '../../lib/familias';
import { alternarFamilia } from '../../lib/filtros';
import { esPublicable } from '../../lib/producto';
import { FAMILIAS_PORTADA, conDatos } from '../../config/contenido';
import ProductCard from './ProductCard';
import s from './HojaFamilia.module.css';

/**
 * Las familias de la portada ("¿Con cuál te identificás?") abren esta hoja encima de la portada (Sebas, 23/10).
 * Antes cada familia llevaba a /catalogo?familia= y, al cambiar de pagina, por
 * un instante se veia el pie: parecia un error. Ahora la hoja sube desde
 * abajo como la ficha, con las mismas tarjetas del catalogo, y una capa opaca
 * tapa todo, tambien la barra: tocar afuera (o "atras") la cierra y la clienta
 * sigue en la seccion donde estaba, no en el inicio.
 *
 * Vive en la direccion (/?familia=amaderados), como la ficha (?aroma=): se
 * puede compartir y "atras" la cierra.
 *
 * Arriba de las tarjetas van las cinco familias (Sebas, 23/10: "que aparezcan
 * los restantes para agregar o cambiar"). Tocar otra la suma; tocar una
 * marcada la saca, salvo la ultima: la hoja nunca queda vacia. Cambiar es
 * sumar la nueva y sacar la vieja. Van debajo de la cabecera fija, no adentro:
 * en el celular ocupan tres renglones y se van al bajar.
 */
export default function HojaFamilia({ familias = [], onCambiar, products, onClose, onOpen, onElegir, promos, disparador = null, inert }) {
  const hoja = useRef(null);
  const cerrarRef = useRef(null);
  const elegidas = FAMILIAS.filter((f) => familias.includes(f.id));
  const familia = elegidas[0];
  const varias = elegidas.length > 1;
  const lista = useMemo(
    () => products.filter((p) => p.activo && esPublicable(p) && familias.includes(familiaDe(p))),
    [products, familias]
  );
  const nombres = elegidas.map((f) => f.nombre);
  const resumen = nombres.length > 1 ? `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}` : '';

  // Con la ficha, la hoja de tamanos o el cajon abiertos encima, esta hoja
  // queda quieta: no toma el foco ni cierra con Escape (si no, un Escape
  // cerraba las dos capas juntas).
  const { open: cajonAbierto } = useCart();
  const tapada = inert !== undefined || cajonAbierto;
  useDialogo({ abierto: !tapada, onCerrar: onClose, refInicial: cerrarRef, disparador });
  useBloqueoScroll();

  if (!familia) return null;
  return (
    <>
      <div className={s.capa} onClick={onClose} aria-hidden="true" />
      <div
        ref={hoja}
        className={`dia ${s.hoja}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-familia-titulo"
        data-dialogo="familia"
        inert={tapada ? '' : undefined}
      >
        <header className={s.cabeza}>
          <div>
            <h2 id="hoja-familia-titulo" className={s.titulo}>
              {varias ? conDatos(FAMILIAS_PORTADA.varias, { n: elegidas.length }) : familia.nombre}
            </h2>
            <p className={s.bajada}>
              {varias ? resumen : FAMILIAS_PORTADA.ejemplos[familia.id]}
              {lista.length > 0 && <span className={`${s.cuenta} tnum`}> · {conDatos(FAMILIAS_PORTADA.cuenta, { n: lista.length })}</span>}
            </p>
          </div>
          <button ref={cerrarRef} type="button" className={s.cerrar} onClick={onClose} aria-label={FAMILIAS_PORTADA.cerrar}>✕</button>
        </header>
        <div className={s.elegir}>
          <p className={s.rotulo} id="hoja-familia-sumar">{FAMILIAS_PORTADA.sumar}</p>
          <div className={s.chips} role="group" aria-labelledby="hoja-familia-sumar" data-qa="hoja-familias">
            {FAMILIAS.map((f) => {
              const activa = familias.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`${s.chip} ${activa ? s.chipOn : ''}`}
                  aria-pressed={activa}
                  onClick={() => onCambiar?.(alternarFamilia(familias, f.id, { minimo: 1 }))}
                >
                  {activa && <span className={s.tilde} aria-hidden="true">✓</span>}
                  {f.nombre}
                </button>
              );
            })}
          </div>
        </div>
        <div className={s.grilla}>
          {lista.map((p) => (
            <ProductCard key={p.id} producto={p} onOpen={onOpen} onElegir={onElegir} promos={promos} />
          ))}
        </div>
      </div>
    </>
  );
}
