import { estadoCiclo } from '../../lib/ciclo';
import { CICLO, conDatos } from '../../config/contenido';
import s from './TiraCiclo.module.css';

/**
 * La tira del ciclo: hasta cuando se puede pedir y cuantos dias quedan. Es
 * urgencia real (sale de ciclo_hasta, que carga Sebas), no un contador
 * inventado. Con 3 dias o menos la cifra pasa al acento. Si la fecha falta o
 * ya paso, no hay tira: nunca una fecha vencida a la vista.
 *
 * En el HTML pre-generado y en el primer dibujado del navegador los ajustes
 * todavia no llegaron, asi que no se dibuja nada en los dos: la hidratacion
 * coincide.
 */
export default function TiraCiclo({ settings, className = '' }) {
  const e = estadoCiclo({ nombre: settings?.ciclo_nombre, hasta: settings?.ciclo_hasta });
  if (!e) return null;
  const quedan = e.dias === 0
    ? CICLO.quedan.hoy
    : e.dias === 1 ? CICLO.quedan.uno : conDatos(CICLO.quedan.varios, { n: e.dias });
  return (
    <p className={`${s.tira} tnum ${className}`} data-qa="ciclo">
      {e.nombre && (
        <>
          <span className={s.nombre}>{e.nombre}</span>
          <span className={s.sep} aria-hidden="true"> · </span>
        </>
      )}
      <span className={s.dato}>{conDatos(CICLO.hasta, { dia: e.dia })}</span>
      <span className={s.sep} aria-hidden="true"> · </span>
      <span className={`${s.dato} ${s.dias} ${e.urgente ? s.urgente : ''}`} data-qa="ciclo-dias">{quedan}</span>
    </p>
  );
}
