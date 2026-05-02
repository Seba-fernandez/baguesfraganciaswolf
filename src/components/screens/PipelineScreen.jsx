import { useMemo } from 'react';
import useContacts from '../../hooks/useContacts';
import { ESTADOS } from '../../data/constants';
import Avatar from '../ui/Avatar';
import s from './PipelineScreen.module.css';

export default function PipelineScreen() {
  const { contacts, loading } = useContacts();

  const groups = useMemo(() =>
    Object.keys(ESTADOS).map(key => ({
      ...ESTADOS[key],
      contacts: contacts.filter(c => c.estado === key),
    })),
  [contacts]);

  if (loading) return <div className={s.loading}>Cargando...</div>;

  return (
    <div className={s.screen}>
      <h2 className={s.title}>Pipeline de ventas</h2>
      <p className={s.subtitle}>{contacts.length} contactos en total</p>

      <div className={s.groups}>
        {groups.map(group => (
          <div key={group.id}>
            <div className={s.groupHeader}>
              <span className={s.groupDot} style={{ background: group.color }} />
              <span className={s.groupLabel}>{group.label}</span>
              <span className={s.groupCount}>{group.contacts.length}</span>
            </div>
            <div className={`${s.groupBody} glass`}>
              {group.contacts.length === 0 ? (
                <div className={s.groupEmpty}>Sin contactos</div>
              ) : (
                <ul className={s.groupList}>
                  {group.contacts.map(c => (
                    <li key={c.id} className={s.item}>
                      <Avatar name={c.n} size={32} radius={10} />
                      <div className={s.itemInfo}>
                        <div className={s.itemName}>{c.n}</div>
                        <div className={s.itemSub}>{c.dir}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
