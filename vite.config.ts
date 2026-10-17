/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * GitHub Pages sirve el sitio en https://USUARIO.github.io/NOMBRE-DEL-REPOSITORIO/.
 * La base se toma de VITE_BASE (la fija el workflow de GitHub Actions con el nombre real del
 * repositorio). En local se usa '/'. Si publica en un dominio propio o en USUARIO.github.io,
 * defina VITE_BASE=/ al compilar.
 */
const base = process.env.VITE_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ['plotly.js-basic-dist-min'],
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 60000,
  },
});
