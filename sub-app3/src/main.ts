import { createApp, type App as VueApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import {
  renderWithQiankun,
  qiankunWindow,
  type QiankunProps,
} from 'vite-plugin-qiankun/dist/helper'

import App from './App.vue'
import router from './router'

let app: VueApp | null = null

function render(props?: QiankunProps) {
  const container = props?.container
  const mountPoint = container
    ? (container.querySelector('#app') as HTMLElement)
    : document.getElementById('app')

  app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.use(ElementPlus)
  app.mount(mountPoint!)
}

// 在 qiankun 容器中运行
if (qiankunWindow.__POWERED_BY_QIANKUN__) {
  renderWithQiankun({
    mount(props) { render(props) },
    bootstrap() { return Promise.resolve() },
    unmount() {
      app?.unmount()
      app = null
    },
    update() { return Promise.resolve() },
  })
} else {
  // 独立运行
  render()
}
