import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const interfuerzaToken = env.INTERFUERZA_TOKEN

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/interfuerza': {
          target: 'https://app.interfuerza.com',
          changeOrigin: true,
          secure: true,
          rewrite: () => '/api/v4/',
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (interfuerzaToken) {
                proxyReq.setHeader('X-IFX-Token', interfuerzaToken)
              }
            })
          },
        },
      },
    },
  }
})
