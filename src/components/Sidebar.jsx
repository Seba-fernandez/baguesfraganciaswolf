import { useState, useEffect } from 'react';
import { ESTADOS, NAV_ITEMS } from '../data/constants';

export default function Sidebar({ view, stats, totalContacts, convRate, onChangeView }) {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const glassWidget = {
    borderRadius: 18, padding: 16,
    background: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(30px) saturate(160%)',
    WebkitBackdropFilter: 'blur(30px) saturate(160%)',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 24px rgba(0,0,0,0.2)',
    position: 'relative', overflow: 'hidden',
  };

  const sheen = {
    content: '""',
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '50%',
    borderRadius: '18px 18px 0 0',
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 100%)',
    pointerEvents: 'none',
  };

  return (
    <div style={{
      width: 250, minHeight: '100vh', padding: '28px 14px',
      display: 'flex', flexDirection: 'column',
      background: 'rgba(15,15,18,0.45)',
      backdropFilter: 'blur(60px) saturate(180%)',
      WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      animation: 'fadeUp 0.5s ease', flexShrink: 0,
      boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    }}>
      {/* Brand */}
      <div style={{ padding: '0 16px', marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 13,
            background: 'linear-gradient(135deg, rgba(10,132,255,0.4), rgba(191,90,242,0.4))',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            boxShadow: '0 4px 20px rgba(10,132,255,0.2), inset 0 1px 0 rgba(255,255,255,0.25)',
          }}>🍽</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.4 }}>Vajilla CRM</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Córdoba Capital</div>
          </div>
        </div>
      </div>

      {/* Clock */}
      <div style={{ ...glassWidget, margin: '0 4px 24px', textAlign: 'center' }}>
        <div style={sheen} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 30, fontWeight: 200, letterSpacing: 2, color: 'rgba(235,235,245,0.85)', fontVariantNumeric: 'tabular-nums' }}>
            {time.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontWeight: 500 }}>
            {time.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ padding: '0 4px' }}>
        <div className="label-xs" style={{ padding: '0 16px', marginBottom: 10 }}>Pipeline</div>
        {NAV_ITEMS.map(item => {
          const isActive = view === item.key;
          const count = item.key === 'todos' ? totalContacts : (stats[item.key] || 0);
          const stColor = item.key !== 'todos' && ESTADOS[item.key] ? ESTADOS[item.key].color : 'var(--text-tertiary)';
          return (
            <div key={item.key} className={`nav-item ${isActive ? 'active' : ''}`} onClick={() => onChangeView(item.key)}
              style={isActive ? {
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 2px 12px rgba(0,0,0,0.15)',
              } : {}}
            >
              <span style={{ fontSize: 14, width: 22, textAlign: 'center', color: isActive ? stColor : 'var(--text-quaternary)', transition: 'color .2s' }}>{item.icon}</span>
              <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)', flex: 1 }}>{item.label}</span>
              <span style={{ fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: isActive ? 'var(--text-secondary)' : 'var(--text-quaternary)', background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent', padding: '2px 8px', borderRadius: 8 }}>{count}</span>
            </div>
          );
        })}
      </div>

      {/* Conversion */}
      <div style={{ marginTop: 'auto', padding: '0 4px' }}>
        <div style={{ ...glassWidget, padding: 20 }}>
          <div style={sheen} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span className="label-xs">Conversión</span>
              <span style={{ fontSize: 28, fontWeight: 200, color: '#30D158', letterSpacing: -1 }}>{convRate}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 6, background: 'linear-gradient(90deg,#30D158,#34C759,#30D158)', backgroundSize: '200% 100%', width: `${convRate}%`, transition: 'width .8s ease', animation: convRate > 0 ? 'shimmer 3s linear infinite' : 'none' }} />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 10 }}>🍽 Paris ×146 + tenedores</div>
          </div>
        </div>
      </div>
    </div>
  );
}