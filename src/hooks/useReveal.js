import { useEffect, useRef } from 'react';

/**
 * Agrega .trevealed a los .treveal dentro del ref cuando entran en viewport.
 * Robusto: si nadie scrollea (o el elemento ya está a la vista), revela igual.
 *
 * También robusto a contenido dinámico: cuando cambia un filtro (p. ej. el
 * de género en el catálogo), React desmonta los cards viejos y monta cards
 * nuevos con clase .treveal fresca — un IntersectionObserver que solo mira
 * una vez al montar (como era antes) nunca los ve, y esos productos quedan
 * en opacity:0 para siempre ("el producto desaparece y no vuelve"). Un
 * MutationObserver watchea el DOM y engancha los .treveal que van
 * apareciendo, durante toda la vida del componente.
 */
export default function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      // Ni siquiera hace falta observar nada: todo lo que entre queda
      // visible de una. Igual hay que cubrir contenido futuro (filtros).
      const revealAll = () => {
        root.querySelectorAll('.treveal:not(.trevealed)').forEach((el) => el.classList.add('trevealed'));
      };
      revealAll();
      const mo = new MutationObserver(revealAll);
      mo.observe(root, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('trevealed');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );

    const observeNew = () => {
      root.querySelectorAll('.treveal:not(.trevealed)').forEach((el) => io.observe(el));
    };
    observeNew();

    const mo = new MutationObserver(observeNew);
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return ref;
}
