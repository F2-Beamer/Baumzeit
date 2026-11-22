import { defineConfig } from 'vite';

// Tauri erwartet einen festen Port und darf den Rust-Ordner nicht beobachten.
export default defineConfig({
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] }
  },
  build: {
    target: 'chrome105',
    minify: 'esbuild',
    sourcemap: false
  }
});
