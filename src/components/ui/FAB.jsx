export default function FAB({ onClick, ariaLabel = 'Agregar', fixed = true }) {
  return (
    <button
      className={`fab ${fixed ? 'fab--fixed' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="fab__highlight" aria-hidden="true" />
      <span className="fab__plus">+</span>
    </button>
  );
}
