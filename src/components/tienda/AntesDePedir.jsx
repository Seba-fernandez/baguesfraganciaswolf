import useReveal from '../../hooks/useReveal';
import { ANTES_DE_PEDIR } from '../../config/contenido';
import { ENVIO_GRATIS_DESDE } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import TiraCiclo from './TiraCiclo';
import s from './AntesDePedir.module.css';

/**
 * Antes de pedir: seña, envío, Córdoba y cuándo llega. Es lo que se pregunta
 * quien no te conoce antes de escribir. Cada dato abre con una cifra grande
 * (lo que se lee de un vistazo, en vez de cuatro párrafos) y abajo el detalle.
 * Rediseño D (plano 6, el último día): papel un tono más hondo, que avisa que
 * la página se termina; las cifras en Melodrama vino.
 *
 * Debajo del título, la tira del ciclo (hasta cuándo se pide), solo si el
 * ciclo tiene fecha vigente.
 */
export default function AntesDePedir({ settings }) {
  const ref = useReveal();
  const monto = pesos(ENVIO_GRATIS_DESDE);
  const conMonto = (t) => t.replace('{monto}', monto);

  return (
    <section className={`dia ${s.banda}`} id="antes" ref={ref} aria-labelledby="antes-titulo">
      <div className={`tw ${s.section}`}>
        <h2 id="antes-titulo" className={s.titulo}>{ANTES_DE_PEDIR.titulo}</h2>
        <TiraCiclo settings={settings} className={s.ciclo} />
        <dl className={s.grilla}>
          {ANTES_DE_PEDIR.datos.map((d, i) => (
            <div key={d.titulo} className={`${s.dato} treveal`} style={{ transitionDelay: `${i * 70}ms` }}>
              <dt className={s.encabezado}>
                <span className={`${s.cifra} tnum`} aria-hidden="true">{conMonto(d.cifra)}</span>
                <span className={s.nombre}>{d.titulo}</span>
              </dt>
              <dd className={s.texto}>{conMonto(d.texto)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
