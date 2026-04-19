import { ESTADOS } from '../data/constants';

export default function StatsBar({ stats, view, onChangeView, isDesktop }) {
  return (
    <div
      style={{
        padding: isDesktop ? '12px 0 4px' : '8px 20px 4px',
        display: 'flex', gap: isDesktop ? 10 : 8,
        overflowX: 'auto',
        position: 'relative', zIndex: 1,
      }}
    >
      {Object.entries(ESTADOS).map(([key, cfg]) => {
        const isActive = view === key;
        return (
          <div
            key={key}
            onClick={() => onChangeView(view === key ? 'todos' : key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: isActive ? `rgba(${cfg.g},.18)` : 'rgba(255,255,255,.06)',
              border: isActive ? `1px solid rgba(${cfg.g},.3)` : '1px solid rgba(255,255,255,.1)',
              color: isActive ? cfg.color : 'rgba(235,235,245,0.45)',
              cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap',
              backdropFilter: 'blur(10px)',
              padding: isDesktop ? '8px 18px' : '7px 14px',
              borderRadius: isDesktop ? 16 : 14,
              flex: isDesktop ? 1 : 'none',
              justifyContent: isDesktop ? 'center' : 'flex-start',
              boxShadow: isActive
                ? `0 0 12px rgba(${cfg.g},.15), inset 0 1px 0 rgba(255,255,255,.1)`
                : 'inset 0 1px 0 rgba(255,255,255,.05)',
            }}
          >
            <span
              style={{
                width: 6, height: 6, borderRadius: '50%',
                background: cfg.color,
                boxShadow: isActive ? `0 0 8px rgba(${cfg.g},.6)` : `0 0 4px rgba(${cfg.g},.3)`,
              }}
            />
            <span style={{
              fontSize: isDesktop ? 13 : 12,
              fontWeight: 700,
              letterSpacing: .3,
            }}>
              {stats[key] || 0}
            </span>
            {isDesktop && (
              <span style={{ fontSize: 10, color: 'var(--text-quaternary)', fontWeight: 500 }}>
                {cfg.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}