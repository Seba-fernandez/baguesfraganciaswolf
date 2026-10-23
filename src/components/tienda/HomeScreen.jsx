import { useOutletContext } from 'react-router-dom';
import Hero from './Hero';
import Ciudades from './Ciudades';
import Familias from './Familias';
import Destacados from './Destacados';
import Opiniones from './Opiniones';
import ComoFunciona from './ComoFunciona';
import AntesDePedir from './AntesDePedir';

/**
 * Página de inicio (rediseño D, 22/10/2026). Sigue el guion de color de
 * docs/PLAN-PORTADA-D.md, una película en dos luces:
 *
 *  1. Hero (noche): qué vendo, que son versiones inspiradas, desde cuánto y el botón.
 *  2. Las ciudades (día): cada caja con su ciudad, el perfume y el precio.
 *     Reemplaza a "Lo que pagás", que Sebas decidió sacar.
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
    totalAromas, desde, nombresAromas,
    abrir, elegirTamano, verPromo,
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
      <Ciudades products={products} onOpen={abrir} />
      <Familias />
      <Destacados products={products} onOpen={abrir} onElegir={elegirTamano} cargando={loading} />
      <Opiniones />
      <ComoFunciona settings={settings} products={products} />
      <AntesDePedir settings={settings} />
    </>
  );
}
