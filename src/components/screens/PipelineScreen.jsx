import { useMemo } from 'react';
import useContacts from '../../hooks/useContacts';
import { ESTADOS } from '../../data/constants';
import Avatar from '../ui/Avatar';

export default function PipelineScreen() {
  const { contacts, loading } = useContacts();

  const groups = useMemo(() => {
    return Object.keys(ESTADOS).map(key => ({
      ...ESTADOS[key],
      contacts: contacts.filter(c => c.estado === key),
    }));
  }, [contacts]);

  if (loading) {
    return <div className="screen-loading">Cargando...</div>;
  }

  return (
    <div className="pipeline-screen">
      <h2 className="screen-title">Pipeline de ventas</h2>
      <p className="screen-subtitle">{contacts.length} contactos en total</p>

      <div className="pipeline-groups">
        {groups.map(group => (
          <div key={group.id} className="pipeline-group">
            <div className="pipeline-group__header">
              <span className="pipeline-group__dot" style={{ background: group.color }} />
              <span className="pipeline-group__label">{group.label}</span>
              <span className="pipeline-group__count">{group.contacts.length}</span>
            </div>
            <div className="pipeline-group__body glass">
              {group.contacts.length === 0 ? (
                <div className="pipeline-group__empty">Sin contactos</div>
              ) : (
                <ul className="pipeline-group__list">
                  {group.contacts.map(c => (
                    <li key={c.id} className="pipeline-group__item">
                      <Avatar name={c.n} size={32} radius={10} />
                      <div className="pipeline-group__item-info">
                        <div className="pipeline-group__item-name">{c.n}</div>
                        <div className="pipeline-group__item-sub">{c.dir}</div>
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
