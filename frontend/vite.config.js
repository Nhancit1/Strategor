import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/app2/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/app2\/api/, '/api')
      },
      '/app2/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/app2\/socket\.io/, '/socket.io')
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          socket: ['socket.io-client'],
          quill: ['quill'],
        },
      },
    },
  },
});
