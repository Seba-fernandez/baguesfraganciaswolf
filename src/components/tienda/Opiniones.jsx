import useReveal from '../../hooks/useReveal';
import { OPINIONES } from '../../config/contenido';
import opiniones from '../../data/opiniones.json';
import s from './Opiniones.module.css';

/**
 * Lo que me escriben (E3-B6): capturas reales de WhatsApp de clientas, en una
 * fila que se desliza con el dedo. Es la prueba que pide quien nunca le compró
 * a un particular. Sin capturas cargadas no se dibuja nada: ni el título.
 *
 * Cada entrada de src/data/opiniones.json:
 *   { "imagen": "/opiniones/archivo.webp", "ancho": 720, "alto": 1280,
 *     "alt": "Mensaje de una clienta: ..." , "aroma": "Good Girl" }
 * "aroma" es opcional; "alt" transcribe el mensaje para el lector de pantalla.
 *
 * Rediseño D: lista para cuando lleguen las capturas. Va entre los destacados
 * (el clímax vino) y cómo funciona, de día sobre papel: después del "esto es
 * lo que más sale" llega el "y a otras les gustó". Capturas rectas con la
 * misma sombra de las fotos, en una fila que llega al borde derecho como los
 * destacados.
 */
export default function Opiniones({ lista = opiniones }) {
  const ref = useReveal();
  const validas = (lista || []).filter((o) => o && o.imagen && o.alt);
  if (validas.length === 0) return null;
  return (
    <section className={`dia ${s.section}`} id="opiniones" ref={ref} aria-labelledby="opiniones-titulo">
      <div className="tw">
      <h2 id="opiniones-titulo" className={s.titulo}>{OPINIONES.titulo}</h2>
      <p className={s.bajada}>{OPINIONES.bajada}</p>
      <ul className={s.fila}>
        {validas.map((o, i) => (
          <li key={o.imagen} className={`${s.item} treveal`} style={{ transitionDelay: `${Math.min(i, 4) * 70}ms` }}>
            <img
              src={o.imagen}
              alt={o.alt}
              width={o.ancho || 720}
              height={o.alto || 1280}
              loading="lazy"
              decoding="async"
              className={s.captura}
            />
            {o.aroma && <span className={s.aroma}>{o.aroma}</span>}
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
}
