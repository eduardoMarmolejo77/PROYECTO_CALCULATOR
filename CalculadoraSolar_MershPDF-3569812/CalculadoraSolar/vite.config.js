import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import process from 'node:process';

function obtenerTarget(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return 'https://app.interfuerza.com';
  }
}

function obtenerPathBase(baseUrl) {
  try {
    const url = new URL(baseUrl);
    return url.pathname || '/';
  } catch {
    return '/api/v4/';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'https://app.interfuerza.com/api/v4/';
  const token = env.VITE_API_TOKEN || '';
  const tokenHeader = env.VITE_API_TOKEN_HEADER || 'Authorization';
  const target = obtenerTarget(apiBaseUrl);
  const pathBase = obtenerPathBase(apiBaseUrl);

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/proxy': {
          target,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => {
            const relativePath = path.replace(/^\/api\/proxy/, '');
            const normalizedBase = pathBase.endsWith('/') ? pathBase : `${pathBase}/`;
            const normalizedRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
            return `${normalizedBase}${normalizedRelative}`;
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (token) {
                proxyReq.setHeader(tokenHeader, token);
              }
            });
          },
        },
      },
    },
  };
});
