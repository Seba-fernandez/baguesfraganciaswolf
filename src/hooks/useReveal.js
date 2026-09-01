import { useEffect, useRef } from 'react';

/**
 * Agrega .trevealed a los .treveal dentro del ref cuando entran en viewport.
 * Robusto: si nadie scrollea (o el elemento ya está a la vista), revela igual.
 */
export default function useReveal() {
  const ref = useRef(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll('.treveal');
    if (!targets.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      targets.forEach((el) => el.classList.add('trevealed'));
      return;
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
    targets.forEach((el) => io.observe(el));

    return () => io.disconnect();
  }, []);

  return ref;
}
