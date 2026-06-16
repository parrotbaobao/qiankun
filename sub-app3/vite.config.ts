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
    proxy: {
      '/lm-studio': {
        target: 'http://localhost:3200',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/lm-studio/, ''),
      },
    },
  },
  build: {
    rollupOptions: {
      // mermaid 是 @matechat/core 的可选动态依赖（流程图功能），
      // 我们不使用该功能，标记为 external 避免构建报错
      external: ['mermaid'],
      output: {
        manualChunks: {
          'matechat': ['@matechat/core'],
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 把 @matechat/common 指向本地复制的源码目录（源码版 Tab2 用）
      '@matechat/common': fileURLToPath(new URL('./src/matechat-source/matechat-common', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        // @matechat/common/Base/vue.scss 内 @use '_mixin' 用到了相对路径
        // 需要让 sass 能找到 matechat-common 目录
        loadPaths: [
          fileURLToPath(new URL('./src/matechat-source/matechat-common', import.meta.url)),
        ],
      },
    },
  },
})
