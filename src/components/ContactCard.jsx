import StatusChip from './StatusChip';
import ChannelButtons from './ChannelButtons';
import { PRIORIDADES } from '../data/constants';

export default function ContactCard({ contact, isActive, onClick, index, isDesktop }) {
  const pc = PRIORIDADES[contact.prior];

  // ---- DESKTOP: Table row ----
  if (isDesktop) {
    return (
      <div
        className={`table-row ${isActive ? 'active' : ''}`}
        onClick={onClick}
        style={{ animation: `fadeUp .3s ease ${index * .02}s both` }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-quaternary)', fontWeight: 500, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{contact.id}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: -.2 }}>{contact.n}</div>
          <div style={{ fontSize: 11, color: 'var(--text-quaternary)', marginTop: 1 }}>
            {contact.tel ? `📞 ${contact.telShow}` : contact.fuente}
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{contact.tipo}</span>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{contact.dir}</span>
        <StatusChip estado={contact.estado} />
        <span style={{ fontSize: 10, fontWeight: 700, color: pc.color, textAlign: 'center' }}>{pc.label}</span>
        <div onClick={e => e.stopPropagation()}>
          <ChannelButtons contact={contact} layout="row" />
        </div>
      </div>
    );
  }

  // ---- MOBILE: Card ----
  return (
    <div
      className={`row-card ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ animation: `fadeUp .3s ease ${index * .03}s both` }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -.2, marginBottom: 2 }}>{contact.n}</div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{contact.dir}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, marginLeft: 12 }}>
          <StatusChip estado={contact.estado} />
          <span style={{ fontSize: 10, fontWeight: 700, color: pc.color }}>{pc.label}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 500 }}>{contact.tipo} · {contact.fuente}</span>
        <div onClick={e => e.stopPropagation()}>
          <ChannelButtons contact={contact} layout="row" />
        </div>
      </div>
    </div>
  );
}
