import { ESTADOS } from '../../data/constants';

export default function StatusBadge({ statusId, small = false }) {
  const s = ESTADOS[statusId] || ESTADOS.pendiente;

  return (
    <span
      className={`status-badge ${small ? 'status-badge--small' : ''}`}
      style={{
        '--badge-color': s.color,
        '--badge-bg': s.bg,
        '--badge-rim': s.rim,
      }}
    >
      <span className="status-badge__dot" />
      {s.label}
    </span>
  );
}
