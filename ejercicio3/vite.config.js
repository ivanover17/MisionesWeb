import { defineConfig } from 'vite';

/**
 * Los navegadores bloquean <script type="module"> cuando la página se abre desde disco (file://).
 * Para que dist/index.html funcione con doble clic, la build genera un script clásico (IIFE)
 * y quitamos type="module" y crossorigin de las etiquetas que inserta Vite.
 * En desarrollo (npm run dev) el código sigue cargándose como módulos ES separados.
 */
const openFromDisk = () => ({
  name: 'open-from-disk',
  apply: 'build',
  transformIndexHtml: (html) =>
    html
      .replace(/<script type="module" crossorigin src=/g, '<script defer src=')
      .replace(/ crossorigin(?=[\s>])/g, (match, offset) =>
        // Mantener el crossorigin del preconnect de Google Fonts.
        html.slice(Math.max(0, offset - 60), offset).includes('fonts.gstatic') ? match : '',
      ),
});

export default defineConfig({
  base: './',
  plugins: [openFromDisk()],
  build: {
    // Un único style.css enlazado con <link> en vez de inyectado desde el JS.
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        format: 'iife',
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
