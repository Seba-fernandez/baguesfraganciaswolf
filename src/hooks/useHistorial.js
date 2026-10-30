import { useSyncExternalStore } from 'react';
import { suscribir, estado } from '../lib/historialPanel';

/** El estado del deshacer / rehacer del panel (ver lib/historialPanel.js). */
export default function useHistorial() {
  return useSyncExternalStore(suscribir, estado, estado);
}
