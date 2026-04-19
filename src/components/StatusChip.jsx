import { ESTADOS } from '../data/constants';

export default function StatusChip({ estado, size = 'sm' }) {
  const cfg = ESTADOS[estado];
  if (!cfg) return null;

  const isSmall = size === 'sm';

  return (
    <span
      className="chip"
      style={{
        background: `rgba(${cfg.g}, 0.1)`,
        border: `1px solid rgba(${cfg.g}, 0.18)`,
        color: cfg.color,
        padding: isSmall ? '4px 12px' : '5px 16px',
        fontSize: isSmall ? 10 : 11,
      }}
    >
      <span
        style={{
          width: isSmall ? 5 : 6,
          height: isSmall ? 5 : 6,
          borderRadius: '50%',
          background: cfg.color,
          boxShadow: `0 0 6px rgba(${cfg.g}, 0.4)`,
          animation: estado === 'pendiente' ? 'glow 2.5s ease infinite' : 'none',
        }}
      />
      {cfg.label}
    </span>
  );
}
