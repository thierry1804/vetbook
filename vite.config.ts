import { defineConfig } from 'vite';

// Serveur de dev statique pour l'app vanilla JS (index.html / app.js / styles.css)
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: false,
  },
});
