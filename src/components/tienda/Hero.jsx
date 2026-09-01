import Bottle3D from './Bottle3D';
import s from './Hero.module.css';

export default function Hero({ promo }) {
  const titulo = promo?.titulo || 'Lo último que te ponés, lo primero que notan';
  const bajada = promo?.bajada ||
    'Elegís el perfume, lo sumás al pedido y me llega por WhatsApp. Confirmo stock y lo tenés el viernes en Córdoba.';

  return (
    <section className={`tw ${s.hero}`}>
      <div className={s.grid}>
        <div>
          <p className={s.eyebrowless}>
            <span className={s.dot} aria-hidden="true" />
            Catálogo de agosto disponible
          </p>
          <h1 className={s.title}>{titulo}</h1>
          <p className={s.lede}>{bajada}</p>
          <div className={s.actions}>
            <a href="#catalogo" className="tbtn">
              Ver catálogo
              <span className="circ">↗</span>
            </a>
            <a href="#contacto" className="tbtn ghost">Cómo funciona</a>
          </div>
        </div>

        <div className={s.stage}>
          <div className={s.backdrop} />
          <div className={s.block} />
          <div className={s.bottle}>
            <Bottle3D />
          </div>
          <div className={s.ring} aria-hidden="true" />
          <span className={s.hint}>arrastrá para girar</span>
        </div>
      </div>
    </section>
  );
}
