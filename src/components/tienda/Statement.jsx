import useReveal from '../../hooks/useReveal';
import { COMO_FUNCIONA } from '../../config/contenido';
import s from './Statement.module.css';

/**
 * Cómo funciona. Reemplaza al statement decorativo anterior: si alguien
 * compra por primera vez a un vendedor particular, lo que necesita no es una
 * frase linda, es saber que pasa despues de tocar el boton.
 */

export default function Statement({ settings }) {
  const ref = useReveal();
  return (
    <section className={`tw ${s.section}`} id="como" ref={ref}>
      <h2 className={s.titulo}>{COMO_FUNCIONA.titulo}</h2>

      <ol className={s.pasos}>
        {COMO_FUNCIONA.pasos.map((p, i) => (
          <li key={p.n} className={`${s.paso} treveal`} style={{ transitionDelay: `${i * 70}ms` }}>
            <span className={`${s.numero} tnum`}>{p.n}</span>
            <h3 className={s.pasoTitulo}>{p.titulo}</h3>
            <p className={s.pasoTexto}>{p.texto}</p>
          </li>
        ))}
      </ol>

      <p className={s.cita}>{COMO_FUNCIONA.cita}</p>

      {settings?.whatsapp_owner && (
        <a
          className="tbtn"
          href={`https://wa.me/${settings.whatsapp_owner}`}
          target="_blank"
          rel="noopener"
        >
          {COMO_FUNCIONA.boton}
        </a>
      )}
    </section>
  );
}
