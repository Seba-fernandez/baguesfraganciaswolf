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

// Sello circular: texto corriendo en círculo, gira despacio. Reemplaza el
// hint de "arrastrá para girar" como única pista — ahora es una pieza de
// marca en sí misma, no una etiqueta de UI sobre el producto.
function Sello() {
  const texto = 'BAGUÉS · PERFUMES DE NICHO · HECHO A PEDIDO · ';
  return (
    <div className={s.sello} aria-hidden="true">
      <svg viewBox="0 0 200 200">
        <path id="selloPath" fill="none" d="M 100,100 m -78,0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" />
        <text>
          <textPath href="#selloPath">{texto.repeat(2)}</textPath>
        </text>
      </svg>
      <span className={s.selloCentro}>↻</span>
    </div>
  );
}

export default function Hero({ promo }) {
  const titulo = promo?.titulo || 'Lo último que te ponés, lo primero que notan';
  const bajada = promo?.bajada ||
    'Elegís el perfume, lo sumás al pedido y me llega por WhatsApp. Confirmo stock y lo tenés el viernes en Córdoba.';

  return (
    <section className={s.hero}>
      {/* Fondo marmolado a sangre completa (todo el ancho de pantalla, no
          encerrado en una tarjeta chica) — el frasco flota sobre esto en vez
          de estar "embalado" dentro de un cuadro de producto. */}
      <div className={s.backdrop} aria-hidden="true" />

      <div className={`tw ${s.inner}`}>
        <span className={s.spine} aria-hidden="true">Bagués · Catálogo 026</span>

        <div className={s.grid}>
          <div className={s.copy}>
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
            <div className={s.bottle}>
              <Bottle3D />
            </div>
            <div className={s.ring} aria-hidden="true" />
            <Sello />
          </div>
        </div>

        <a href="#catalogo" className={s.scrollCue}>
          <span className={s.scrollLine} aria-hidden="true" />
          <span className="tmono up">Scroll</span>
        </a>
      </div>
    </section>
  );
}
