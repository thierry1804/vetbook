import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement : `npm run dev` sert l'admin sur :5175 et relaie /api vers la stack locale (nginx :3080).
export default defineConfig({
  plugins: [react()],
  server: { port: 5175, proxy: { '/api': { target: 'http://localhost:3080', changeOrigin: false } } },
  build: { outDir: 'dist', sourcemap: false, chunkSizeWarningLimit: 2500 },
});
