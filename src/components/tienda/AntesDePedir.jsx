import useReveal from '../../hooks/useReveal';
import { ANTES_DE_PEDIR } from '../../config/contenido';
import { ENVIO_GRATIS_DESDE } from '../../config/ajustes';
import { pesos } from '../../lib/format';
import TiraCiclo from './TiraCiclo';
import s from './AntesDePedir.module.css';

/**
 * Antes de pedir: cómo se paga, la seña, el envío, Córdoba y cuándo llega.
 * Es lo que una persona que llega por un link y no te conoce se pregunta antes
 * de escribir. Cuatro datos cortos, sin íconos: el único acento es el monto
 * del envío gratis, que es la cifra que decide.
 *
 * Debajo del título, la tira del ciclo (hasta cuándo se pide), que contesta
 * el "cuándo llega" antes de leerlo: solo si el ciclo tiene fecha vigente.
 */
export default function AntesDePedir({ settings }) {
  const ref = useReveal();
  return (
    <section className={`tw ${s.section}`} id="antes" ref={ref}>
      <h2 className={s.titulo}>{ANTES_DE_PEDIR.titulo}</h2>
      <TiraCiclo settings={settings} className={s.ciclo} />
      <dl className={s.grilla}>
        {ANTES_DE_PEDIR.datos.map((d, i) => (
          <div key={d.titulo} className={`${s.dato} treveal`} style={{ transitionDelay: `${i * 70}ms` }}>
            <dt className={s.nombre}>{d.titulo}</dt>
            <dd className={s.texto}>
              {d.texto.split('{monto}').map((parte, j) => (
                <span key={j}>
                  {j > 0 && <span className={`${s.cifra} tnum`}>{pesos(ENVIO_GRATIS_DESDE)}</span>}
                  {parte}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
