<template>
    <div class="md" v-html="content"></div>

</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import { computed } from 'vue';

const props = defineProps<{
    content: string;
    streaming: boolean
}>()


const md = new MarkdownIt({
    html: false,   // 不允许 Markdown 里直接写 HTML（更安全）
    linkify: true,
    breaks: true
})

const content = computed(() =>
    md.render(props.content)
)


</script>

<style lang="scss"></style>