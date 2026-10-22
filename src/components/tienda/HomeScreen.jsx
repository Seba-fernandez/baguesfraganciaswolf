import { useOutletContext } from 'react-router-dom';
import Hero from './Hero';
import Destacados from './Destacados';
import Nosotros from './Nosotros';
import ComoFunciona from './ComoFunciona';
import AntesDePedir from './AntesDePedir';
import Opiniones from './Opiniones';

/**
 * Página de inicio. Es la vidriera: el hero, la fila de destacados, quiénes
 * somos, cómo funciona y lo que hay que saber antes de pedir. El catálogo
 * completo vive en su propia página (/catalogo), a un botón de acá. Los datos llegan del TiendaShell por contexto.
 */
export default function HomeScreen() {
  const {
    products, settings, promos, loading,
    totalAromas, desde, nombresAromas, heroProducto,
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
        heroProducto={heroProducto}
        onOpen={abrir}
      />
      <Destacados products={products} onOpen={abrir} cargando={loading} />
      <Nosotros settings={settings} />
      <ComoFunciona settings={settings} products={products} />
      <Opiniones />
      <AntesDePedir settings={settings} />
    </>
  );
}
