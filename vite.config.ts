import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // Base public path for production deployment (root-relative)
    base: '/',

    // Vite plugins
    plugins: [react()],

    // Path alias resolution: allows '@/' to point directly to './src'
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // Development server configuration
    server: {
      port: 5173,

      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify (file watching is disabled to prevent flickering during agent edits).
      hmr: env.DISABLE_HMR !== 'true',

      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: env.DISABLE_HMR === 'true' ? null : {},

      // Proxies every /api/* call to the Python backend (Flask on port 8000),
      // so components can keep using relative fetch('/api/...') or axios calls
      // without CORS complications during local development.
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },

    // Production build optimizations
    build: {
      outDir: 'dist',
      sourcemap: false,

      // Increase chunk size limit warning threshold (default is 500kb)
      chunkSizeWarningLimit: 1000,

      // Custom Rollup chunking strategy:
      // Splits heavy external libraries into separate cacheable bundles
      // to ensure fast initial page loads in production.
      rollupOptions: {
        output: {
          manualChunks: {
            // Core React runtime dependencies
            vendor: ['react', 'react-dom', 'react-router-dom'],
            // Visualization library (Recharts + D3 internals)
            charts: ['recharts'],
            // SVG icon set
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
