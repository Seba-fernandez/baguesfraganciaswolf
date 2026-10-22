import { useOutletContext } from 'react-router-dom';
import Hero from './Hero';
import Nosotros from './Nosotros';
import Familias from './Familias';
import Destacados from './Destacados';
import Opiniones from './Opiniones';
import ComoFunciona from './ComoFunciona';
import AntesDePedir from './AntesDePedir';

/**
 * Página de inicio (rediseño C). El orden sigue a la evaluación de captación
 * del 22/10/2026:
 *
 *  1. Hero: qué vendo, que son versiones inspiradas, desde cuánto y el botón.
 *  2. Lo que pagás y lo que no: la confianza antes de las dos pantallas.
 *  3. ¿Qué te gusta oler?: la puerta para quien no sabe qué quiere o regala.
 *  4. Los que siempre salen: los destacados.
 *  5. Lo que me escriben: capturas de clientas (oculta mientras esté vacía).
 *  6. Cómo funciona: el chat de WhatsApp.
 *  7. Antes de pedir: seña, envío, Córdoba.
 *
 * El catálogo completo vive en /catalogo. Los datos llegan del TiendaShell.
 */
export default function HomeScreen() {
  const {
    products, settings, promos, loading,
    totalAromas, desde, lista, nombresAromas,
    abrir, verPromo,
  } = useOutletContext();

  return (
    <>
      <Hero
        settings={settings}
        promos={promos}
        onVerPromo={verPromo}
        totalAromas={totalAromas}
        desde={desde}
        nombresAromas={nombresAromas}
        onOpen={abrir}
      />
      <Nosotros desde={desde} lista={lista} />
      <Familias />
      <Destacados products={products} onOpen={abrir} cargando={loading} />
      <Opiniones />
      <ComoFunciona settings={settings} products={products} />
      <AntesDePedir settings={settings} />
    </>
  );
}
