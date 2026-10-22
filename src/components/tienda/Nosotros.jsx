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
 * Una placa vino con arco arriba, del mismo material que el hero. Dos columnas
 * lado a lado también en el celular: lo que pagás en tinta, lo que no pagás
 * tachado con el acento, como el precio de lista. Sin íconos de tilde ni cruz.
 */
export default function Nosotros() {
  const ref = useReveal();
  const conMonto = (t) => t.replace('{monto}', pesos(ENVIO_GRATIS_DESDE));

  return (
    <section className={`tw ${s.section}`} id="nosotros" ref={ref} aria-labelledby="nosotros-titulo">
      <div className={`${s.placa} treveal`}>
        <h2 id="nosotros-titulo" className={s.titulo}>{NOSOTROS.titulo}</h2>
        <p className={s.intro}>{NOSOTROS.intro}</p>

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

        <p className={s.firma}>{NOSOTROS.firma}</p>
      </div>
    </section>
  );
}
