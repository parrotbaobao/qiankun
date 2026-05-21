import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import qiankun from 'vite-plugin-qiankun'

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    qiankun('sub-app3', { useDevMode: true }),
  ],
  base: 'http://localhost:5174/',
  server: {
    port: 5174,
    headers: { 'Access-Control-Allow-Origin': '*' },
    origin: 'http://localhost:5174',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
