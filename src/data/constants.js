// Estados con la paleta nueva del diseño v2
// color: hex principal (texto y dot)
// bg: tinted background del badge
// rim: border del badge

export const ESTADOS = {
  pendiente: {
    id: 'pendiente',
    label: 'Pendiente',
    color: '#818cf8',
    bg: 'rgba(99, 102, 241, 0.25)',
    rim: 'rgba(99, 102, 241, 0.6)',
  },
  contactado: {
    id: 'contactado',
    label: 'Contactado',
    color: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.25)',
    rim: 'rgba(6, 182, 212, 0.6)',
  },
  interesado: {
    id: 'interesado',
    label: 'Interesado',
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.25)',
    rim: 'rgba(245, 158, 11, 0.6)',
  },
  no_interesa: {
    id: 'no_interesa',
    label: 'No interesa',
    color: '#94a3b8',
    bg: 'rgba(100, 116, 139, 0.2)',
    rim: 'rgba(100, 116, 139, 0.5)',
  },
  vendido: {
    id: 'vendido',
    label: 'Vendido',
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.25)',
    rim: 'rgba(16, 185, 129, 0.6)',
  },
};

export const PRIORIDADES = {
  alta: { label: 'Alta', color: '#f43f5e' },
  media: { label: 'Media', color: '#fbbf24' },
  baja: { label: 'Baja', color: '#94a3b8' },
};

// Para retrocompatibilidad con el código viejo
export const NAV_ITEMS = [
  { id: 'contacts', label: 'Contactos', path: '/' },
  { id: 'pipeline', label: 'Pipeline', path: '/pipeline' },
  { id: 'settings', label: 'Config', path: '/settings' },
];
