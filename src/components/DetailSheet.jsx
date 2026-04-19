import StatusChip from './StatusChip';
import ChannelButtons from './ChannelButtons';
import { ESTADOS, PRIORIDADES } from '../data/constants';

export default function DetailSheet({ contact, notes, onUpdateNotes, onUpdateField, onClose, isDesktop }) {
  if (!contact) return null;
  const ec = ESTADOS[contact.estado];

  const content = (
    <>

      {/* Close (desktop) */}
      {isDesktop && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span className="label-xs">Detalle #{contact.id}</span>
          <div onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 10,
            background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'all .2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.12)'; e.currentTarget.style.color = '#f5f5f7'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; e.currentTarget.style.color = 'var(--text-tertiary)'; }}
          >✕</div>
        </div>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 20, margin: '0 auto 12px',
          background: `linear-gradient(135deg,rgba(${ec.g},.2),rgba(${ec.g},.05))`,
          border: '1px solid rgba(255,255,255,.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
          boxShadow: `0 8px 32px rgba(${ec.g},.1), inset 0 1px 0 rgba(255,255,255,.15)`,
        }}>🏪</div>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: -.3, marginBottom: 4 }}>{contact.n}</h2>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 10 }}>{contact.tipo}</p>
        <StatusChip estado={contact.estado} size="md" />
      </div>

      {/* Info */}
      <div className="glass-light" style={{ borderRadius: 20, padding: 18, marginBottom: 14 }}>
        {[
          { icon: '📍', label: 'Dirección', val: contact.dir },
          { icon: '📞', label: 'Teléfono', val: contact.telShow || 'No disponible' },
          { icon: '📡', label: 'Fuente', val: contact.fuente },
        ].map((r, i) => (
          <div key={r.label} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,.04)' : 'none' }}>
            <span style={{ fontSize: 14 }}>{r.icon}</span>
            <div>
              <div className="label-xs">{r.label}</div>
              <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 2 }}>{r.val}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Channels */}
      <div style={{ marginBottom: 14 }}>
        <ChannelButtons contact={contact} layout="full" />
      </div>

      {/* Research notes */}
      <div className="glass-light" style={{ borderRadius: 18, padding: 16, marginBottom: 14, borderColor: 'rgba(255,149,10,.12)', background: 'rgba(255,149,10,.03)' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#FF9F0A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Investigación</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{contact.notas}</div>
      </div>

      {/* My notes */}
      <div style={{ marginBottom: 18 }}>
        <div className="label-xs" style={{ marginBottom: 8 }}>Mis notas</div>
        <textarea
          placeholder="Qué te dijeron, cuándo volver a llamar..."
          value={notes || ''}
          onChange={e => onUpdateNotes(contact.id, e.target.value)}
          style={{
            width: '100%', minHeight: 80, padding: 14, borderRadius: 16,
            border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.03)',
            backdropFilter: 'blur(20px)', color: 'var(--text-primary)',
            fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6,
            transition: 'all .25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--glass-border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(10,132,255,.1)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.04)'; }}
        />
      </div>

      {/* Estado */}
      <div style={{ marginBottom: 18 }}>
        <div className="label-xs" style={{ marginBottom: 10 }}>Estado</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Object.entries(ESTADOS).map(([key, cfg]) => {
            const on = contact.estado === key;
            return (
              <button key={key} className="est-btn" onClick={() => onUpdateField(contact.id, 'estado', key)} style={{
                background: on ? `rgba(${cfg.g},.1)` : 'rgba(255,255,255,.02)',
                color: on ? cfg.color : 'var(--text-tertiary)',
                border: on ? `1px solid rgba(${cfg.g},.22)` : '1px solid rgba(255,255,255,.05)',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: on ? cfg.color : 'rgba(255,255,255,.1)', boxShadow: on ? `0 0 10px rgba(${cfg.g},.4)` : 'none' }} />
                {cfg.label}
                {on && <span style={{ marginLeft: 'auto', opacity: .5 }}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Prioridad */}
      <div style={{ marginBottom: 10 }}>
        <div className="label-xs" style={{ marginBottom: 10 }}>Prioridad</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {Object.entries(PRIORIDADES).map(([key, cfg]) => {
            const on = contact.prior === key;
            return (
              <button key={key} className="est-btn" onClick={() => onUpdateField(contact.id, 'prior', key)} style={{
                flex: 1, justifyContent: 'center',
                background: on ? `${cfg.color}15` : 'rgba(255,255,255,.02)',
                color: on ? cfg.color : 'var(--text-tertiary)',
                border: on ? `1px solid ${cfg.color}30` : '1px solid rgba(255,255,255,.05)',
              }}>{cfg.label}</button>
            );
          })}
        </div>
      </div>
    </>
  );

  // Desktop: render as inline side panel (no overlay)
  if (isDesktop) {
    return (
      <div className="detail-sheet" style={{
        width: 360, height: '100vh', overflowY: 'auto',
        background: 'rgba(20,20,22,0.6)',
        backdropFilter: 'blur(60px) saturate(150%)', WebkitBackdropFilter: 'blur(60px) saturate(150%)',
        borderLeft: '1px solid rgba(255,255,255,.05)',
        padding: '24px 22px', animation: 'slideRight .25s ease', flexShrink: 0,
      }}>
        {content}
      </div>
    );
  }

  // Mobile: bottom sheet with tappable overlay above
  return (
    <>
      {/* Overlay — tap anywhere above the sheet to close */}
      <div
        className="overlay detail-overlay"
        onClick={onClose}
        style={{ zIndex: 90 }}
      />
      {/* Sheet — 65% max height so overlay is always visible above */}
      <div
        className="sheet detail-sheet glass"
        style={{ maxHeight: '65vh', paddingTop: 6 }}
      >
        {/* Handle — visual cue that it's dismissible */}
        <div
          onClick={onClose}
          style={{
            width: 40, height: 5, borderRadius: 3,
            background: 'rgba(255,255,255,0.3)',
            margin: '8px auto 16px',
            cursor: 'pointer',
          }}
        />
        {content}
      </div>
    </>
  );
}