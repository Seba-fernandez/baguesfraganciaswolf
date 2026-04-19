import { ESTADOS, NAV_ITEMS } from '../data/constants';

export default function MenuSheet({ view, stats, totalContacts, convRate, onChangeView, onClose }) {
  return (
    <>
      <div className="overlay" onClick={onClose} style={{ zIndex: 80 }} />
      <div className="glass" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 85,
        borderRadius: '24px 24px 0 0', animation: 'slideUp .3s ease',
        padding: '16px 20px 40px', borderBottom: 'none',
      }}>
        <div className="sheet-handle" />
        <div className="label-xs" style={{ marginBottom: 12 }}>Pipeline</div>

        {NAV_ITEMS.map(item => {
          const isActive = view === item.key;
          const count = item.key === 'todos' ? totalContacts : (stats[item.key] || 0);
          const stColor = item.key !== 'todos' && ESTADOS[item.key] ? ESTADOS[item.key].color : 'var(--text-tertiary)';
          return (
            <div key={item.key} onClick={() => { onChangeView(item.key); onClose(); }} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
              borderRadius: 16, marginBottom: 4, cursor: 'pointer',
              background: isActive ? 'rgba(255,255,255,.06)' : 'transparent',
              border: isActive ? '1px solid rgba(255,255,255,.08)' : '1px solid transparent',
              transition: 'all .2s',
            }}>
              <span style={{ fontSize: 10, color: stColor }}>●</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: isActive ? 600 : 400, color: isActive ? '#f5f5f7' : 'var(--text-secondary)' }}>{item.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-quaternary)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
            </div>
          );
        })}

        <div className="glass-light" style={{ marginTop: 16, padding: 20, borderRadius: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span className="label-xs">Conversión</span>
            <span style={{ fontSize: 32, fontWeight: 200, color: '#30D158', letterSpacing: -1 }}>{convRate}%</span>
          </div>
          <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#30D158,#34C759,#30D158)', backgroundSize: '200% 100%', width: `${convRate}%`, transition: 'width .8s ease', animation: convRate > 0 ? 'shimmer 3s linear infinite' : 'none' }} />
          </div>
        </div>
        <div onClick={onClose} style={{ textAlign: 'center', padding: 14, marginTop: 12, fontSize: 14, fontWeight: 600, color: '#0A84FF', cursor: 'pointer' }}>Cerrar</div>
      </div>
    </>
  );
}
