import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La version publicada (commit corto) para el registro de errores
// (src/lib/errores.js). Vercel la pasa en VERCEL_GIT_COMMIT_SHA.
const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7);

export default defineConfig({
  plugins: [react()],
  define: { __VERSION__: JSON.stringify(VERSION) },
  server: {
    port: 5173,
    open: true,
  },
});
