import useReveal from '../../hooks/useReveal';
import { NOSOTROS } from '../../config/contenido';
import { ENVIO_GRATIS_DESDE } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import s from './Nosotros.module.css';

/**
 * Lo que pagás y lo que no (rediseño C, E3-B4). Va justo después del hero:
 * contesta la duda que deja "al precio que todavía no" (¿por qué sale menos?
 * ¿es confiable?) antes de las dos pantallas, como pide la evaluación.
 *
 * Una placa vino con arco, del mismo material que el hero: arriba, una caja
 * Bagués real en su ventana; después la cuenta con números del catálogo (el
 * precio más bajo contra su precio de lista) y las dos columnas lado a lado
 * también en el celular. Lo que no pagás va tachado con el acento, como el
 * precio de lista. Sin íconos de tilde ni cruz.
 */
export default function Nosotros({ desde = null, lista = null }) {
  const ref = useReveal();
  const conMonto = (t) => t.replace('{monto}', pesos(ENVIO_GRATIS_DESDE));

  return (
    <section className={`tw ${s.section}`} id="nosotros" ref={ref} aria-labelledby="nosotros-titulo">
      <div className={`${s.placa} treveal`}>
        <span className={s.ventana} aria-hidden="true">
          <img
            src="/nosotros/venecia-300.webp"
            srcSet="/nosotros/venecia-300.webp 300w, /nosotros/venecia-480.webp 480w"
            sizes="(max-width: 767px) 150px, 200px"
            width="300" height="400"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </span>

        <h2 id="nosotros-titulo" className={s.titulo}>{NOSOTROS.titulo}</h2>

        {/* La cuenta, con los números del ciclo. Mientras no llegan, el lugar
            queda reservado (sin un número escrito a mano que después cambia). */}
        <p className={`${s.cuenta} tnum`} data-qa="nosotros-cuenta">
          <span className={s.cuentaPrecio}>{desde ? pesos(desde) : ''}</span>
          {lista && <s className={s.cuentaLista}>{pesos(lista)}</s>}
          <span className={s.cuentaTexto}>{NOSOTROS.cuenta}</span>
        </p>

        <div className={s.columnas}>
          <div className={s.col} data-qa="pagas">
            <h3 className={s.colTitulo}>{NOSOTROS.pagas.titulo}</h3>
            <ul className={s.lista}>
              {NOSOTROS.pagas.items.map((t) => <li key={t} className={s.item}>{conMonto(t)}</li>)}
            </ul>
          </div>
          <div className={`${s.col} ${s.colNo}`} data-qa="no-pagas">
            <h3 className={s.colTitulo}>{NOSOTROS.noPagas.titulo}</h3>
            <ul className={s.lista}>
              {NOSOTROS.noPagas.items.map((t) => <li key={t} className={`${s.item} ${s.tachado}`}>{conMonto(t)}</li>)}
            </ul>
          </div>
        </div>

        <p className={s.intro}>{NOSOTROS.intro}</p>
        <p className={s.firma}>{NOSOTROS.firma}</p>
      </div>
    </section>
  );
}
