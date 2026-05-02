import { useState, useCallback } from 'react';
import useContacts from '../../hooks/useContacts';
import { ESTADOS } from '../../data/constants';
import StatsBar from '../StatsBar';
import ContactCard from '../ContactCard';
import DetailSheet from '../DetailSheet';
import FAB from '../ui/FAB';
import s from './ContactsScreen.module.css';

export default function ContactsScreen() {
  const { contacts, loading, updateField } = useContacts();
  const [search, setSearch] = useState('');
  const [view, setView] = useState('todos');
  const [selectedId, setSelectedId] = useState(null);

  const toggleSelect = useCallback((id) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const stats = {};
  Object.keys(ESTADOS).forEach(k => {
    stats[k] = contacts.filter(c => c.estado === k).length;
  });

  const filtered = contacts.filter(c => {
    if (view !== 'todos' && c.estado !== view) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.n.toLowerCase().includes(q) || (c.dir || '').toLowerCase().includes(q);
    }
    return true;
  });

  const selected = selectedId ? contacts.find(c => c.id === selectedId) : null;

  if (loading) return <div className={s.empty}><span className={s.emptyText}>Cargando contactos...</span></div>;

  if (contacts.length === 0) {
    return (
      <div className={s.empty}>
        <div className={s.emptyIcon} aria-hidden="true">👥</div>
        <h2 className={s.emptyTitle}>Sin contactos aún</h2>
        <p className={s.emptyText}>Tocá el botón + para agregar tu primer contacto</p>
        <FAB onClick={() => alert('La función de agregar contactos llega en el próximo update')} fixed />
      </div>
    );
  }

  return (
    <div className={`${s.screen} fade-in`}>
      <div className={s.searchWrap}>
        <svg className={s.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          className={s.searchInput}
          type="text"
          placeholder="Buscar contacto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <StatsBar stats={stats} view={view} onChangeView={setView} isDesktop={false} />

      <div className={s.count}>
        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
      </div>

      <div className={s.list}>
        {filtered.map((c, i) => (
          <ContactCard
            key={c.id}
            contact={c}
            isDesktop={false}
            isActive={selectedId === c.id}
            onClick={() => toggleSelect(c.id)}
            index={i}
          />
        ))}
        {filtered.length === 0 && (
          <div className={`${s.empty} ${s.emptyInline}`}>
            <div className={s.emptyText}>Sin resultados</div>
          </div>
        )}
      </div>

      {selected && (
        <DetailSheet
          contact={selected}
          notes={selected.notasPersonales}
          onUpdateNotes={(id, v) => updateField(id, 'notasPersonales', v)}
          onUpdateField={updateField}
          onClose={() => setSelectedId(null)}
          isDesktop={false}
        />
      )}

      <FAB onClick={() => alert('La función de agregar contactos llega en el próximo update')} fixed />
    </div>
  );
}
