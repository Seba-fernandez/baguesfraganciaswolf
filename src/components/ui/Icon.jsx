// Set chico de íconos de línea, consistentes con los del BottomNav.
// Reemplaza los emoji (política anti-emoji: en distintos SO/fuentes un emoji
// se ve distinto o borroso; un ícono de línea propio siempre es igual).

const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconBottle({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M10 2v3.5a2 2 0 0 1-.6 1.4L5 11a5 5 0 0 0-1.5 3.5V19a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4.5A5 5 0 0 0 19 11l-4.4-4.1a2 2 0 0 1-.6-1.4V2" />
      <path d="M8 2h8" />
    </svg>
  );
}

export function IconClipboard({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

export function IconPerson({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

export function IconGear({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function IconLogout({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function IconChat({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}

export function IconStore({ size = 22, ...p }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} {...p}>
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
      <path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0" />
    </svg>
  );
}

export const NAV_ICONS = {
  pedidos: IconClipboard,
  productos: IconBottle,
  clientes: IconPerson,
  ajustes: IconGear,
};
