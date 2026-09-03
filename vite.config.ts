import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Yeh block hamesha Port 3000 aur Codespace network ko theek rakhega
  server: {
    port: 3000,
    strictPort: true,
    host: true,
  }
});