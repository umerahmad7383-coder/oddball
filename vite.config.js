import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Every game is its own page so its code and styles never leak into another game.
// Add a game: create <slug>/index.html and list it here.
const pages = { hub: 'index.html', 'anti-scam': 'anti-scam/index.html', 'deadline-day': 'deadline-day/index.html', 'normal-form': 'normal-form/index.html', 'tiny-nation': 'tiny-nation/index.html', site: 'site/index.html' };

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } } },
  build: {
    outDir: 'dist', sourcemap: false,
    rollupOptions: { input: Object.fromEntries(Object.entries(pages).map(([k, v]) => [k, resolve(process.cwd(), v)])) },
  },
});
