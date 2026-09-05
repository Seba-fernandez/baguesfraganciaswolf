import useReveal from '../../hooks/useReveal';
import s from './Statement.module.css';

/**
 * Cómo funciona. Reemplaza al statement decorativo anterior: si alguien
 * compra por primera vez a un vendedor particular, lo que necesita no es una
 * frase linda, es saber que pasa despues de tocar el boton.
 */
const PASOS = [
  { n: '01', t: 'Armás el pedido', d: 'Elegís los aromas y la presentación. No se paga nada en la web.' },
  { n: '02', t: 'Te escribo', d: 'El pedido me llega por WhatsApp y te confirmo stock, total y tiempos.' },
  { n: '03', t: 'Lo retirás', d: 'La mercadería llega los viernes. Coordinamos entrega en Córdoba.' },
];

export default function Statement({ settings }) {
  const ref = useReveal();
  return (
    <section className={`tw ${s.section}`} id="como" ref={ref}>
      <h2 className={s.titulo}>Cómo funciona</h2>

      <ol className={s.pasos}>
        {PASOS.map((p, i) => (
          <li key={p.n} className={`${s.paso} treveal`} style={{ transitionDelay: `${i * 70}ms` }}>
            <span className={`${s.numero} tnum`}>{p.n}</span>
            <h3 className={s.pasoTitulo}>{p.t}</h3>
            <p className={s.pasoTexto}>{p.d}</p>
          </li>
        ))}
      </ol>

      <p className={s.cita}>
        Trabajo por encargo, con catálogo propio y precio de reventa directa.
      </p>

      {settings?.whatsapp_owner && (
        <a
          className="tbtn"
          href={`https://wa.me/${settings.whatsapp_owner}`}
          target="_blank"
          rel="noopener"
        >
          Escribime por WhatsApp
        </a>
      )}
    </section>
  );
}
