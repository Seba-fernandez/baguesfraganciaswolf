import { ESTADOS } from '../data/constants';

export default function StatsBar({ stats, view, onChangeView, isDesktop }) {
  return (
    <div style={{
      padding: isDesktop ? '12px 0 4px' : '8px 20px 4px',
      display: 'flex', gap: isDesktop ? 10 : 6,
      overflowX: 'auto', position: 'relative', zIndex: 1,
    }}>
      {Object.entries(ESTADOS).map(([key, cfg]) => {
        const isActive = view === key;
        return (
          <div
            key={key}
            onClick={() => onChangeView(view === key ? 'todos' : key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isActive ? `rgba(${cfg.g},.15)` : 'rgba(255,255,255,.04)',
              border: isActive ? `1px solid rgba(${cfg.g},.25)` : '1px solid rgba(255,255,255,.06)',
              color: isActive ? cfg.color : 'var(--text-tertiary)',
              cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)',
              padding: isDesktop ? '8px 18px' : '6px 14px',
              borderRadius: isDesktop ? 16 : 14,
              flex: isDesktop ? 1 : 'none',
              justifyContent: isDesktop ? 'center' : 'flex-start',
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: cfg.color, boxShadow: isActive ? `0 0 8px rgba(${cfg.g},.5)` : 'none' }} />
            <span style={{ fontSize: isDesktop ? 12 : 10, fontWeight: 600, letterSpacing: .3 }}>{stats[key] || 0}</span>
            {isDesktop && <span style={{ fontSize: 10, color: 'var(--text-quaternary)', fontWeight: 500 }}>{cfg.label}</span>}
          </div>
        );
      })}
    </div>
  );
}
