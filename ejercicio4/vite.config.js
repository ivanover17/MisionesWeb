import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Igual que en la M2: quiero que `dist/index.html` se pueda abrir con doble clic.
 * Los navegadores no cargan <script type="module"> desde file://, así que en el
 * build se genera un único JS "normal" (formato iife), con rutas relativas,
 * y se quita el type="module" del HTML.
 */
const classicScript = {
  name: 'classic-script',
  transformIndexHtml: {
    order: 'post',
    handler: (html) =>
      html
        .replace(/<script type="module" crossorigin/g, '<script defer')
        .replace(/ crossorigin(?=[ >])/g, ''),
  },
};

export default defineConfig({
  base: './',
  plugins: [react(), classicScript],
  build: {
    modulePreload: false,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true },
    },
  },
});
