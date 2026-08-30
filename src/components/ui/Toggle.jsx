import s from './Toggle.module.css';

/** Switch on/off. `checked` controlado, `onChange(nuevoValor)`. */
export default function Toggle({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`${s.toggle} ${checked ? s.on : ''}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <span className={s.knob} />
    </button>
  );
}
