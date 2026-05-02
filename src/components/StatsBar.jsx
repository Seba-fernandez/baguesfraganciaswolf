import { ESTADOS } from '../data/constants';
import s from './StatsBar.module.css';

export default function StatsBar({ stats, view, onChangeView, isDesktop }) {
  return (
    <div className={s.bar}>
      {Object.entries(ESTADOS).map(([key, cfg]) => {
        const on = view === key;
        const count = stats[key] || 0;

        return (
          <button
            key={key}
            type="button"
            onClick={() => onChangeView(view === key ? 'todos' : key)}
            className={s.chip}
            style={on ? {
              background: cfg.bg,
              borderColor: cfg.rim,
              color: cfg.color,
              boxShadow: `0 0 12px ${cfg.bg}, inset 0 1px 0 rgba(255,255,255,0.2)`,
            } : undefined}
          >
            <span className={s.dot} style={{ background: cfg.color, color: cfg.color }} />
            <span>{count}</span>
            {isDesktop && <span className={s.label}>{cfg.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
