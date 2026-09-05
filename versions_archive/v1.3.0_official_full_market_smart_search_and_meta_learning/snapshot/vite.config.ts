import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // Essential for Electron production file:// loading
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-kline': ['klinecharts'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/versions_archive/**'],
  },
});
