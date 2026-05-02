import StatusBadge from './ui/StatusBadge';
import ChannelButtons from './ChannelButtons';
import Avatar from './ui/Avatar';
import { PRIORIDADES } from '../data/constants';
import s from './ContactCard.module.css';

export default function ContactCard({ contact, isActive, onClick, index, isDesktop }) {
  const pc = PRIORIDADES[contact.prior] || PRIORIDADES.media;
  const stagger = { animation: `fadeUp .35s cubic-bezier(.34,1.56,.64,1) ${index * 0.03}s both` };
  const cls = `${s.card} glass ${isActive ? s.isActive : ''} ${isDesktop ? s.desktop : ''}`;

  return (
    <div className={cls} onClick={onClick} role="button" tabIndex={0} style={stagger}>
      <div className={s.top}>
        <Avatar name={contact.n} size={isDesktop ? 48 : 42} radius={14} />
        <div className={s.info}>
          <h3 className={s.name}>{contact.n}</h3>
          <p className={s.address}>{contact.dir || '—'}</p>
        </div>
        <div className={s.meta}>
          <StatusBadge statusId={contact.estado} small />
          <span className={s.priority} style={{ color: pc.color }}>{pc.label}</span>
        </div>
      </div>
      <div className={s.divider} />
      <div className={s.bottom}>
        <span className={s.source}>
          {[contact.tipo, contact.fuente].filter(Boolean).join(' · ') || 'Sin info adicional'}
        </span>
        <div onClick={e => e.stopPropagation()}>
          <ChannelButtons contact={contact} />
        </div>
      </div>
    </div>
  );
}
