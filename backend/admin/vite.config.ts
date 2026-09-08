import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = (env.VITE_API_URL || env.API_URL || '').replace(/\/$/, '');

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'API_'],
    define: apiUrl
      ? { 'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl) }
      : {},
    server: {
      host: true,
      port: 5174,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
        '/uploads': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
