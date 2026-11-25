import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { HERO_NAVIDAD } from './src/config/ajustes.js';

// La version publicada (commit corto) para el registro de errores
// (src/lib/errores.js). Vercel la pasa en VERCEL_GIT_COMMIT_SHA.
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7);

// index.html precarga la imagen del hero (la que pinta primero, el LCP). Con el
// hero de Navidad prendido (HERO_NAVIDAD en src/config/ajustes.js) se precarga
// su fondo en vez de la escena de siempre: mismas pantallas, mismos tamaños.
// Las demas capas las descubre el navegador al leer el CSS, que va en el HTML.
function precargaDelHero() {
  return {
    name: 'precarga-del-hero',
    transformIndexHtml(html) {
      if (!HERO_NAVIDAD) return html;
      return html.replace(/\/hero\/c\/hero_c_(\d+x\d+)\.avif/g, '/hero/navidad/fondo_$1.avif');
    },
  };
}

export default defineConfig({
  plugins: [react(), precargaDelHero()],
  define: { __VERSION__: JSON.stringify(VERSION) },
  server: {
    port: 5173,
    open: true,
  },
});
