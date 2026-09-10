import useReveal from '../../hooks/useReveal';
import { COMO_FUNCIONA } from '../../config/contenido';
import s from './ComoFunciona.module.css';

/**
 * Cómo funciona. Centrado, con un icono claro por paso y poco texto: lo que
 * alguien que compra por primera vez necesita es entender de un vistazo qué
 * pasa después de tocar el botón, no leer un párrafo.
 *
 * Los iconos son SVG de trazo (estilo Lucide), no dibujos a mano: una bolsa
 * (armás), un globo de chat (te escribo) y una caja (lo retirás). Intuitivos y
 * consistentes entre sí.
 */
const ICONOS = {
  bolsa: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  chat: (
    <>
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </>
  ),
  caja: (
    <>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="M3.3 7 12 12l8.7-5" />
      <path d="M12 22V12" />
    </>
  ),
};

export default function ComoFunciona({ settings }) {
  const ref = useReveal();
  return (
    <section className={`tw ${s.section}`} id="como" ref={ref}>
      <h2 className={s.titulo}>{COMO_FUNCIONA.titulo}</h2>

      <ol className={s.pasos}>
        {COMO_FUNCIONA.pasos.map((p, i) => (
          <li key={p.n} className={`${s.paso} treveal`} style={{ transitionDelay: `${i * 90}ms` }}>
            <span className={s.iconoWrap} aria-hidden="true">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                {ICONOS[p.icono]}
              </svg>
            </span>
            <span className={`${s.numero} tnum`}>{p.n}</span>
            <h3 className={s.pasoTitulo}>{p.titulo}</h3>
            <p className={s.pasoTexto}>{p.texto}</p>
          </li>
        ))}
      </ol>

      <p className={s.cita}>{COMO_FUNCIONA.cita}</p>

      {settings?.whatsapp_owner && (
        <a className="tbtn" href={`https://wa.me/${settings.whatsapp_owner}`} target="_blank" rel="noopener">
          {COMO_FUNCIONA.boton}
        </a>
      )}
    </section>
  );
}
