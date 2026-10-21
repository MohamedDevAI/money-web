import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Defaults to IIFL Capital Markets' APIs v1 (https://api.iiflcapital.com/v1)
  const iiflTarget =
    env.VITE_IIFL_GATEWAY_URL || 'https://api.iiflcapital.com/v1';

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api/iifl': {
          target: iiflTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/iifl/, ''),
        },
        '/api': {
          target: env.VITE_BACKEND_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
