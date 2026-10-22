import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Vite Configuration for Money OS (Investing & Pro Trading Terminal).
 * All data fetching operations (MongoDB, Live NSE/BSE Feeds, AMFI NAVs, IIFL Broker API)
 * are executed by the Spring Boot backend (money-api on port 8080).
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
