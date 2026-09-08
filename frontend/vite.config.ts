import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiUrl = (env.VITE_API_URL || env.API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

  return {
    plugins: [react()],
    envPrefix: ['VITE_', 'API_'],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      port: 5173,
    },
  };
});
