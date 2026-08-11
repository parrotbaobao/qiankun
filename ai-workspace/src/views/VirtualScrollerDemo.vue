<template>
  <div class="page">
    <h2>动态虚拟列表测试（{{ list.length }} 条）</h2>
    <MyDynamicScroller :data="list" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MyDynamicScroller from '../components/MyDynamicScroller.vue'

const WORDS = [
  'qiankun', 'vue', 'vite', 'virtual', 'scroller', 'dynamic', 'height',
  'observer', 'resize', 'angular', 'micro', 'frontend', 'lorem', 'ipsum',
  'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', '前端', '虚拟列表',
  '动态高度', '微前端', '性能优化', '滚动', '渲染', '组件',
]

function randomSentence(min = 3, max = 60) {
  const len = Math.floor(Math.random() * (max - min + 1)) + min
  const arr: string[] = []
  for (let i = 0; i < len; i++) {
    arr.push(WORDS[Math.floor(Math.random() * WORDS.length)])
  }
  return arr.join(' ')
}

const list = ref(
  Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `#${i + 1} ${randomSentence()}`,
  })),
)
</script>

<style scoped>
.page {
  padding: 16px;
}
</style>
