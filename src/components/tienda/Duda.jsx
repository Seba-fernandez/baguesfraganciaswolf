import { Link } from 'react-router-dom';
import useReveal from '../../hooks/useReveal';
import { DUDA } from '../../config/contenido';
import s from './Duda.module.css';

/**
 * "¿Son truchos?" (borrador, oculto: MOSTRAR_DUDA en ajustes.js). La charla
 * de venta de Sebas: no compite en calidad con el perfume de vidriera, compite
 * en como se usa. De un lado un frasco solo, del otro cuatro; la cifra grande
 * es lo unico que hay que leer. Banda vino, despues de los destacados: es el
 * momento en que ya se vieron los precios y aparece la duda.
 */
export default function Duda() {
  const ref = useReveal();
  return (
    <section className={s.section} id="duda" ref={ref} aria-labelledby="duda-titulo">
      <div className="tw">
        <header className={`${s.head} treveal`}>
          <h2 id="duda-titulo" className={s.titulo}>{DUDA.titulo}</h2>
          <p className={s.bajada}>{DUDA.bajada}</p>
        </header>
        <div className={s.comparacion}>
          {[DUDA.vidriera, DUDA.bagues].map((lado, i) => (
            <div key={lado.rotulo} className={`${s.lado} ${i ? s.nuestro : ''} treveal`} style={{ transitionDelay: `${i * 120}ms` }}>
              <span className={s.rotulo}>{lado.rotulo}</span>
              <span className={s.cifra} aria-hidden="true">{lado.cifra}</span>
              <span className={s.frascos} aria-hidden="true">
                {Array.from({ length: Number(lado.cifra) }, (_, k) => <span key={k} className={s.frasco} />)}
              </span>
              <p className={s.texto}>{lado.texto}</p>
            </div>
          ))}
        </div>
        <p className={`${s.cierre} treveal`}>{DUDA.cierre}</p>
        <Link to="/catalogo" className={`tbtn ${s.boton}`}>{DUDA.boton}</Link>
      </div>
    </section>
  );
}
