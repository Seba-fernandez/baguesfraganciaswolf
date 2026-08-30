// ============================================================================
// Constantes del dominio — Bagues Grupo Wolf
// DB (Postgres) usa snake_case; acá se mapea a config de UI.
// ============================================================================

// Emails con acceso al panel. Debe coincidir con la función es_admin() de la DB
// (supabase/migrations/0003 y 0006).
export const ADMIN_EMAILS = ['sebixtar@gmail.com'];

// ---------- ESTADOS DE PEDIDO ------------------------------------------------
// orden: posición de la columna en el tablero.  hint: qué significa.
export const ESTADOS_PEDIDO = {
  nuevo: {
    id: 'nuevo', label: 'Nuevo', orden: 0,
    hint: 'Entró un pedido. Todavía no hiciste nada.',
    color: '#818cf8', bg: 'rgba(99,102,241,0.22)', rim: 'rgba(99,102,241,0.55)',
  },
  senia: {
    id: 'senia', label: 'Con seña', orden: 1,
    hint: 'El cliente pagó la seña.',
    color: '#fbbf24', bg: 'rgba(245,158,11,0.22)', rim: 'rgba(245,158,11,0.55)',
  },
  cargado: {
    id: 'cargado', label: 'Cargado en Bagués', orden: 2,
    hint: 'Ya lo cargaste en la web de tu proveedora.',
    color: '#22d3ee', bg: 'rgba(6,182,212,0.22)', rim: 'rgba(6,182,212,0.55)',
  },
  en_proveedora: {
    id: 'en_proveedora', label: 'En proveedora', orden: 3,
    hint: 'Llegó a tu proveedora. Esperás el viernes.',
    color: '#60a5fa', bg: 'rgba(59,130,246,0.22)', rim: 'rgba(59,130,246,0.55)',
  },
  retirado: {
    id: 'retirado', label: 'Retirado', orden: 4,
    hint: 'Lo buscaste el viernes. Lo tenés vos.',
    color: '#2dd4bf', bg: 'rgba(20,184,166,0.22)', rim: 'rgba(20,184,166,0.55)',
  },
  avisado: {
    id: 'avisado', label: 'Avisado', orden: 5,
    hint: 'Le avisaste al cliente que está listo.',
    color: '#a3e635', bg: 'rgba(132,204,22,0.22)', rim: 'rgba(132,204,22,0.55)',
  },
  entregado: {
    id: 'entregado', label: 'Entregado', orden: 6,
    hint: 'Cerrado: cobrado y entregado.',
    color: '#34d399', bg: 'rgba(16,185,129,0.22)', rim: 'rgba(16,185,129,0.55)',
  },
  cancelado: {
    id: 'cancelado', label: 'Cancelado', orden: 7,
    hint: 'Se cayó el pedido.',
    color: '#94a3b8', bg: 'rgba(100,116,139,0.2)', rim: 'rgba(100,116,139,0.5)',
  },
};

// Estados considerados "abiertos" (los que requieren tu atención).
export const ESTADOS_ABIERTOS = ['nuevo', 'senia', 'cargado', 'en_proveedora', 'retirado', 'avisado'];

export const ESTADOS_PEDIDO_LISTA = Object.values(ESTADOS_PEDIDO).sort((a, b) => a.orden - b.orden);

// ---------- ESTADO DE PAGO -------------------------------------------------
export const PAGO = {
  no:    { id: 'no',    label: 'Sin pago',   color: '#94a3b8' },
  senia: { id: 'senia', label: 'Seña',       color: '#fbbf24' },
  total: { id: 'total', label: 'Pago total', color: '#34d399' },
};

// ---------- PRODUCTO -----------------------------------------------------
export const GENEROS = {
  masculino: { id: 'masculino', label: 'Masculino' },
  femenino:  { id: 'femenino',  label: 'Femenino' },
  unisex:    { id: 'unisex',    label: 'Unisex' },
};

export const MOMENTOS = {
  verano:   { id: 'verano',   label: 'Verano' },
  invierno: { id: 'invierno', label: 'Invierno' },
  todo:     { id: 'todo',     label: 'Todo el año' },
};

// Presentaciones típicas (ml). Se pueden agregar/quitar por producto.
export const ML_SUGERIDOS = [30, 50, 75, 100];

// ---------- NAVEGACIÓN DEL PANEL ------------------------------------------
export const NAV_PANEL = [
  { id: 'pedidos',   label: 'Pedidos',   path: '/panel',           end: true },
  { id: 'productos', label: 'Catálogo',  path: '/panel/productos', end: false },
  { id: 'clientes',  label: 'Clientes',  path: '/panel/clientes',  end: false },
  { id: 'ajustes',   label: 'Ajustes',   path: '/panel/ajustes',   end: false },
];
