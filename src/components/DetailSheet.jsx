import StatusBadge from './ui/StatusBadge';
import ChannelButtons from './ChannelButtons';
import Avatar from './ui/Avatar';
import { ESTADOS, PRIORIDADES } from '../data/constants';
import s from './DetailSheet.module.css';

const INFO_ROWS = [
  { icon: '📍', label: 'Dirección', field: 'dir' },
  { icon: '📞', label: 'Teléfono', field: 'telShow', fallback: 'tel' },
  { icon: '📡', label: 'Fuente', field: 'fuente' },
];

export default function DetailSheet({ contact, notes, onUpdateNotes, onUpdateField, onClose, isDesktop }) {
  if (!contact) return null;

  const hasChannels = contact.tel || contact.ig || contact.fb || contact.web;

  const content = (
    <>
      {isDesktop && (
        <div className={s.header}>
          <span className={s.id}>Contacto · #{contact.id}</span>
          <button type="button" onClick={onClose} className={s.close} aria-label="Cerrar">✕</button>
        </div>
      )}

      <div className={s.hero}>
        <Avatar name={contact.n} size={64} radius={20} />
        <h2 className={s.heroName}>{contact.n}</h2>
        {contact.tipo && <p className={s.heroType}>{contact.tipo}</p>}
        <StatusBadge statusId={contact.estado} />
      </div>

      <div className={`${s.section} glass`}>
        {INFO_ROWS.map(row => {
          const val = contact[row.field] || (row.fallback && contact[row.fallback]) || '—';
          return (
            <div key={row.label} className={s.infoRow}>
              <span className={s.infoIcon}>{row.icon}</span>
              <div>
                <div className={s.infoLabel}>{row.label}</div>
                <div className={s.infoValue}>{val === '' ? 'No disponible' : val}</div>
              </div>
            </div>
          );
        })}
      </div>

      {hasChannels && (
        <div className={s.channels}>
          <ChannelButtons contact={contact} layout="full" />
        </div>
      )}

      {contact.notas && (
        <div className={`${s.research} glass`}>
          <div className={s.researchLabel}>Investigación</div>
          <div className={s.researchText}>{contact.notas}</div>
        </div>
      )}

      <div className={s.field}>
        <label className={s.fieldLabel}>Mis notas</label>
        <textarea
          className={s.textarea}
          placeholder="Qué te dijeron, cuándo volver a llamar..."
          value={notes || ''}
          onChange={e => onUpdateNotes(contact.id, e.target.value)}
        />
      </div>

      <div className={s.field}>
        <label className={s.fieldLabel}>Estado</label>
        <div className={`${s.options} ${s.column}`}>
          {Object.entries(ESTADOS).map(([key, cfg]) => {
            const on = contact.estado === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onUpdateField(contact.id, 'estado', key)}
                className={s.option}
                style={on ? { background: cfg.bg, borderColor: cfg.rim, color: cfg.color } : undefined}
              >
                <span
                  className={s.optionDot}
                  style={on ? { background: cfg.color, boxShadow: `0 0 8px ${cfg.color}` } : undefined}
                />
                <span>{cfg.label}</span>
                {on && <span className={s.check}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className={s.field}>
        <label className={s.fieldLabel}>Prioridad</label>
        <div className={`${s.options} ${s.row}`}>
          {Object.entries(PRIORIDADES).map(([key, cfg]) => {
            const on = contact.prior === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onUpdateField(contact.id, 'prior', key)}
                className={`${s.option} ${s.optionRow}`}
                style={on ? { background: `${cfg.color}22`, borderColor: `${cfg.color}55`, color: cfg.color } : undefined}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <aside className={`${s.sheet} ${s.desktop} glass-strong`}>
        {content}
      </aside>
    );
  }

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <div className={`${s.sheet} ${s.mobile} glass-strong`}>
        <button type="button" className={s.handle} onClick={onClose} aria-label="Cerrar" />
        {content}
      </div>
    </>
  );
}