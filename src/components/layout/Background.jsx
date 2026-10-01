import { useTheme } from '../../contexts/ThemeContext';

/**
 * Fondo del panel: un degradé quieto, en CSS (.bg-scene en global.css).
 *
 * Antes eran cuatro orbes de color de 400-600 px, desenfocados a 80 px y
 * animados sin parar con la librería de movimiento. Cada cuadro obligaba a
 * recomponer el desenfoque detrás de todo el vidrio del panel: era lo que lo
 * hacía sentir trabado en el celular. El panel es una herramienta de trabajo;
 * el fondo no tiene que moverse.
 */
export default function Background() {
  const { theme } = useTheme();
  return <div className={`bg-scene bg-scene--${theme}`} aria-hidden="true" />;
}
