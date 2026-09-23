import useReveal from '../../hooks/useReveal';
import { NOSOTROS } from '../../config/contenido';
import s from './Nosotros.module.css';

/**
 * Quiénes somos. Un bloque editorial contenido, con el título a la izquierda y
 * el relato a la derecha. Tono cercano y rioplatense: la marca contada por una
 * persona, no por un folleto.
 */
export default function Nosotros() {
  const ref = useReveal();

  return (
    <section className={`tw ${s.section}`} id="nosotros" ref={ref}>
      <div className={`${s.marco} tglass treveal`}>
        <div className={s.izq}>
          <p className={s.eyebrow}>{NOSOTROS.eyebrow}</p>
          <h2 className={s.titulo}>{NOSOTROS.titulo}</h2>
          <p className={s.firma}>{NOSOTROS.firma}</p>
        </div>
        <div className={s.der}>
          {NOSOTROS.parrafos.map((p) => (
            <p key={p.slice(0, 20)} className={s.parrafo}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
