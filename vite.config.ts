import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// In development the console talks to a local API through this proxy, so no
// CORS setup is needed. In production VITE_API_URL points at the API, and the
// console's origin must be in the API's ALLOWED_ORIGINS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue(), tailwindcss()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      port: 5188,
      proxy: { '/v1': { target: env.VITE_API_PROXY || 'http://localhost:8080', changeOrigin: true } },
    },
  }
})
