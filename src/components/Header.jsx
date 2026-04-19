export default function Header({ onOpenMenu, isDesktop }) {
  return (
    <div className="glass" style={{
      position: 'sticky', top: 0, zIndex: 50,
      padding: '16px 20px', borderRadius: 0, border: 'none',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {!isDesktop && (
          <div style={{
            width: 34, height: 34, borderRadius: 12,
            background: 'linear-gradient(135deg,rgba(10,132,255,.35),rgba(191,90,242,.35))',
            border: '1px solid rgba(255,255,255,.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
            boxShadow: '0 4px 16px rgba(10,132,255,.15), inset 0 1px 0 rgba(255,255,255,.2)',
          }}>🍽</div>
        )}
        <div>
          <div style={{ fontSize: isDesktop ? 22 : 16, fontWeight: 700, letterSpacing: -.3 }}>
            {isDesktop ? '' : 'Vajilla CRM'}
          </div>
          {!isDesktop && (
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 500 }}>Paris ×146 · Córdoba</div>
          )}
        </div>
      </div>
      {!isDesktop && (
        <div onClick={onOpenMenu} className="glass-btn" style={{ padding: '8px 12px', borderRadius: 12, fontSize: 13 }}>☰</div>
      )}
    </div>
  );
}
