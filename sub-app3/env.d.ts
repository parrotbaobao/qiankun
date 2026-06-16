/// <reference types="vite/client" />

// vue-virtual-scroller 没有官方 @types 包，用 any 声明以允许任意 slot/prop
declare module 'vue-virtual-scroller' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const DynamicScroller: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const DynamicScrollerItem: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const RecycleScroller: any
}

// mermaid 在 vite.config 中已标为 external，只需类型占位
declare module 'mermaid' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mermaid: any
  export default mermaid
}
