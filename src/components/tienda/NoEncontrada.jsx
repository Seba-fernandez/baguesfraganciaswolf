import { Link } from 'react-router-dom';
import { NO_ENCONTRADA } from '../../config/contenido';
import s from './NoEncontrada.module.css';

/**
 * La pagina que no existe (pendiente desde la etapa 1 de la auditoria).
 *
 * Antes toda direccion desconocida volvia al inicio sin decir nada: un link
 * mal copiado parecia funcionar y la persona no sabia que se habia perdido.
 * Ahora Vercel contesta 404 de verdad con este HTML (dist/404.html, lo arma
 * scripts/prerender.mjs), y desde la app se ve lo mismo. Con la tienda
 * alrededor: la barra para ir al catalogo y el pie.
 */
export default function NoEncontrada() {
  return (
    <section className={`dia ${s.pagina}`} aria-labelledby="no-encontrada-titulo">
      <div className={`tw ${s.caja}`}>
        <p className={s.numero} aria-hidden="true">404</p>
        <h1 id="no-encontrada-titulo" className={s.titulo}>{NO_ENCONTRADA.titulo}</h1>
        <p className={s.texto}>{NO_ENCONTRADA.texto}</p>
        <div className={s.acciones}>
          <Link to="/catalogo" className="tbtn">{NO_ENCONTRADA.catalogo}</Link>
          <Link to="/" className={s.inicio}>{NO_ENCONTRADA.inicio}</Link>
        </div>
      </div>
    </section>
  );
}
