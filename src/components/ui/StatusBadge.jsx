import { ESTADOS_PEDIDO } from '../../data/constants';
import st from './StatusBadge.module.css';

/** Badge del estado de un pedido. `statusId` ∈ ESTADOS_PEDIDO. */
export default function StatusBadge({ statusId, small = false }) {
  const cfg = ESTADOS_PEDIDO[statusId] || ESTADOS_PEDIDO.nuevo;

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
