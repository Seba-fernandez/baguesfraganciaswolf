import { ESTADOS } from '../../data/constants';
import st from './StatusBadge.module.css';

export default function StatusBadge({ statusId, small = false }) {
  const cfg = ESTADOS[statusId] || ESTADOS.pendiente;

  return (
    <span
      className={`${st.badge} ${small ? st.small : ''} status-badge`}
      style={{ '--badge-color': cfg.color, '--badge-bg': cfg.bg, '--badge-rim': cfg.rim }}
    >
      <span className={st.dot} />
      {cfg.label}
    </span>
  );
}
