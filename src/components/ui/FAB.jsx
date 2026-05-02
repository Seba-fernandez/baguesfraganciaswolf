import s from './FAB.module.css';

export default function FAB({ onClick, ariaLabel = 'Agregar', fixed = true }) {
  return (
    <button className={`${s.fab} ${fixed ? s.fixed : ''}`} onClick={onClick} aria-label={ariaLabel}>
      <span className={s.highlight} aria-hidden="true" />
      <span className={s.plus}>+</span>
    </button>
  );
}
