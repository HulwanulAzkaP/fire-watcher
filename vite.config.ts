import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // @ts-ignore
        manualChunks: (id: string) => {
          if (id.includes('maplibre-gl')) return 'maplibre';
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'vendor';
          if (id.includes('lucide-react') || id.includes('canvas-confetti')) return 'icons';
          return undefined;
        },
      },
    },
  },
});
