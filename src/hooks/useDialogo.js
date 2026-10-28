import { useEffect, useRef } from 'react';

/**
 * Lo que necesita un dialogo modal para usarse con teclado y lector de
 * pantalla (patron "dialog modal" de W3C APG), para la ficha y el cajon:
 *
 *  - al abrir, el foco entra al dialogo (a `refInicial`);
 *  - Tab y Mayus+Tab dan la vuelta adentro del dialogo;
 *  - Escape cierra;
 *  - al cerrar, el foco vuelve a quien lo abrio, o a `refRespaldo` si ese
 *    elemento ya no existe o no se puede enfocar.
 *
 * Ademas TiendaLayout pone `inert` en el encabezado, el main y el pie
 * mientras hay un dialogo abierto: el lector de pantalla no lee lo de atras y
 * nada de atras recibe toques.
 *
 * `disparador` es quien lo abrio, cuando se conoce de antes: la ficha se carga
 * aparte (lazy) y cuando se dibuja por primera vez la pagina ya esta inert y
 * la tarjeta ya perdio el foco.
 */
const ENFOCABLES = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function useDialogo({ abierto, onCerrar, refInicial, refRespaldo, disparador = null }) {
  const previo = useRef(null);
  const cerrar = useRef(onCerrar);
  cerrar.current = onCerrar;

  // Quien lo abrio se anota durante el render, ANTES del commit: el mismo
  // commit pone `inert` en la pagina, y un elemento que queda adentro de algo
  // inert pierde el foco. En el efecto ya seria tarde para saber quien era.
  if (abierto && previo.current === null && typeof document !== 'undefined') {
    previo.current = disparador || document.activeElement;
  }

  useEffect(() => {
    if (!abierto) return undefined;
    refInicial?.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') { cerrar.current?.(); return; }
      if (e.key !== 'Tab') return;
      const dialogo = refInicial?.current?.closest('[role=dialog]');
      if (!dialogo) return;
      const lista = [...dialogo.querySelectorAll(ENFOCABLES)].filter((el) => el.getClientRects().length);
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      const fuera = !dialogo.contains(document.activeElement) || document.activeElement === dialogo;
      if (e.shiftKey && (document.activeElement === primero || fuera)) {
        e.preventDefault(); ultimo.focus();
      } else if (!e.shiftKey && (document.activeElement === ultimo || fuera)) {
        e.preventDefault(); primero.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const antes = previo.current;
      previo.current = null;
      // Para cuando corre esto, el commit que cerro el dialogo ya saco el
      // `inert`. Si quien lo abrio sigue ahi, recibe el foco (y el navegador
      // lo trae a la vista: en el celular, la clienta vuelve a su tarjeta).
      if (antes && antes.isConnected && antes !== document.body && !antes.closest('[inert]')) {
        antes.focus();
        if (document.activeElement === antes) return;
      }
      // Se lee al cerrar a proposito: el respaldo que este montado en ese momento.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      refRespaldo?.current?.focus();
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
}
