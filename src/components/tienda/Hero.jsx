import Bottle3D from './Bottle3D';
import s from './Hero.module.css';

// Máscara de palabras: cada palabra vive en su propio overflow:hidden y sube
// desde abajo con un stagger corto — el titular "aparece" en vez de
// simplemente estar ahí al cargar. Técnica estándar de hero editorial
// (SplitText-style) hecha en CSS puro, sin librería.
function TituloMask({ texto }) {
  const palabras = texto.split(' ');
  return (
    <h1 className={s.title}>
      {palabras.map((palabra, i) => (
        <span className={s.word} key={i}>
          <span className={s.wordInner} style={{ '--i': i }}>
            {palabra}
            {i < palabras.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </h1>
  );
}

export default function Hero({ promo }) {
  const titulo = promo?.titulo || 'Lo último que te ponés, lo primero que notan';
  const bajada = promo?.bajada ||
    'Elegís el perfume, lo sumás al pedido y me llega por WhatsApp. Confirmo stock y lo tenés el viernes en Córdoba.';

  return (
    <section className={`tw ${s.hero}`}>
      <span className={s.spine} aria-hidden="true">Bagués · Catálogo 026</span>

      <div className={s.grid}>
        <div>
          <p className={s.eyebrowless}>
            <span className={s.dot} aria-hidden="true" />
            Catálogo de agosto disponible
          </p>
          <TituloMask texto={titulo} />
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

      <a href="#catalogo" className={s.scrollCue}>
        <span className={s.scrollLine} aria-hidden="true" />
        <span className="tmono up">Scroll</span>
      </a>
    </section>
  );
}
