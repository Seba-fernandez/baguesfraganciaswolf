import { useState } from 'react';
import { contactsData } from './data/contacts';
import { ESTADOS } from './data/constants';
import useIsDesktop from './hooks/useIsDesktop';
import AmbientOrbs from './components/AmbientOrbs';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsBar from './components/StatsBar';
import ContactCard from './components/ContactCard';
import DetailSheet from './components/DetailSheet';
import MenuSheet from './components/MenuSheet';

export default function App() {
  const [contacts, setContacts] = useState(contactsData);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('todos');
  const [selectedId, setSelectedId] = useState(null);
  const [notes, setNotes] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const isDesktop = useIsDesktop(768);

  // Stats
  const stats = {};
  Object.keys(ESTADOS).forEach(k => { stats[k] = contacts.filter(c => c.estado === k).length; });
  const convRate = contacts.length ? Math.round(((stats.interesado || 0) + (stats.vendido || 0)) / contacts.length * 100) : 0;

  // Filter
  const filtered = contacts.filter(c => {
    if (view !== 'todos' && c.estado !== view) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.n.toLowerCase().includes(q) || c.dir.toLowerCase().includes(q);
    }
    return true;
  });

  const selected = contacts.find(c => c.id === selectedId) || null;
  const updateField = (id, f, v) => setContacts(p => p.map(c => c.id === id ? { ...c, [f]: v } : c));
  const updateNotes = (id, v) => setNotes(p => ({ ...p, [id]: v }));

  // ---- DESKTOP LAYOUT ----
  if (isDesktop) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>
        <AmbientOrbs />
        <Sidebar view={view} stats={stats} totalContacts={contacts.length} convRate={convRate} onChangeView={setView} />

        {/* Main area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, minWidth: 0 }}>
          {/* Top bar */}
          <div style={{
            padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,.08)',
            background: 'rgba(15,15,18,0.35)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: -.5 }}>
                {view === 'todos' ? 'Todos' : ESTADOS[view]?.label || 'Contactos'}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-tertiary)' }}>
                {filtered.length} contacto{filtered.length !== 1 ? 's' : ''} · Córdoba Capital
              </p>
            </div>
            <input
              type="text" placeholder="⌕  Buscar contacto..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{
                width: 280, padding: '10px 18px', borderRadius: 14,
                border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)',
                backdropFilter: 'blur(20px)', color: 'var(--text-primary)', fontSize: 13,
                outline: 'none', fontFamily: 'inherit', transition: 'all .25s',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--glass-border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(10,132,255,.1)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.04)'; }}
            />
          </div>

          {/* Stats chips */}
          <div style={{ padding: '0 32px' }}>
            <StatsBar stats={stats} view={view} onChangeView={setView} isDesktop />
          </div>

          {/* Table header */}
          <div style={{
            padding: '12px 32px 4px',
            display: 'grid', gridTemplateColumns: '40px 1.6fr 1fr 1fr 120px 80px 130px',
            gap: 8, alignItems: 'center',
          }}>
            {['#', 'Nombre', 'Rubro', 'Ubicación', 'Estado', 'Prior.', 'Contacto'].map(h => (
              <span key={h} className="label-xs" style={{ padding: '0 4px' }}>{h}</span>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '0 28px 28px' }}>
            {filtered.map((c, i) => (
              <ContactCard
                key={c.id} contact={c} isDesktop
                isActive={selectedId === c.id}
                onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
                index={i}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-quaternary)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>⊘</div>
                <div style={{ fontSize: 14 }}>Sin resultados</div>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        {selected && (
          <DetailSheet
            contact={selected} notes={notes[selected.id]}
            onUpdateNotes={updateNotes} onUpdateField={updateField}
            onClose={() => setSelectedId(null)} isDesktop
          />
        )}
      </div>
    );
  }

  // ---- MOBILE LAYOUT ----
  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <AmbientOrbs />
      <Header onOpenMenu={() => setMenuOpen(true)} isDesktop={false} />

      {/* Search */}
      <div style={{ padding: '12px 20px 8px', position: 'relative', zIndex: 1 }}>
        <input
          type="text" placeholder="⌕  Buscar contacto..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '12px 18px', borderRadius: 16,
            border: '1px solid rgba(255,255,255,.08)', background: 'rgba(255,255,255,.04)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            color: 'var(--text-primary)', fontSize: 14, outline: 'none', fontFamily: 'inherit',
            transition: 'all .25s', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.04)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--glass-border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(10,132,255,.1)'; }}
          onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,.08)'; e.target.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,.04)'; }}
        />
      </div>

      <StatsBar stats={stats} view={view} onChangeView={setView} isDesktop={false} />

      <div style={{ padding: '8px 24px 4px', fontSize: 11, color: 'var(--text-quaternary)', fontWeight: 500, position: 'relative', zIndex: 1 }}>
        {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Cards */}
      <div style={{ padding: '4px 14px 120px', position: 'relative', zIndex: 1 }}>
        {filtered.map((c, i) => (
          <ContactCard
            key={c.id} contact={c} isDesktop={false}
            isActive={selectedId === c.id}
            onClick={() => setSelectedId(selectedId === c.id ? null : c.id)}
            index={i}
          />
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-quaternary)' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⊘</div>
            <div style={{ fontSize: 14 }}>Sin resultados</div>
          </div>
        )}
      </div>

      {selected && (
        <DetailSheet
          contact={selected} notes={notes[selected.id]}
          onUpdateNotes={updateNotes} onUpdateField={updateField}
          onClose={() => setSelectedId(null)} isDesktop={false}
        />
      )}

      {menuOpen && (
        <MenuSheet
          view={view} stats={stats} totalContacts={contacts.length}
          convRate={convRate} onChangeView={setView} onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  );
}
