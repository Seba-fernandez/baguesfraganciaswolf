import useReveal from '../../hooks/useReveal';
import s from './Statement.module.css';

export default function Statement() {
  const ref = useReveal();
  return (
    <section className={`tw ${s.section}`} id="contacto" ref={ref}>
      <h2 className="treveal">
        Que pregunten qué{' '}
        <span className={s.hand}>
          tenés
          <svg viewBox="0 0 220 90" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M8,52 C 40,18 90,10 130,14 C 168,17 198,30 210,46 C 198,58 150,74 100,76 C 55,77 18,66 10,50"
              fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round"
            />
          </svg>
        </span>{' '}
        puesto.
      </h2>
    </section>
  );
}
