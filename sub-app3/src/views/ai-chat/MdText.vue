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
    md.render(props.content || '')
)


</script>

<style lang="scss">
.md {
    p { margin: 0 0 8px; &:last-child { margin-bottom: 0; } }
    ul, ol { margin: 6px 0 8px; padding-left: 20px; }
    li { margin-bottom: 3px; }

    code {
        background: #f1f5f9;
        color: #4f46e5;
        border-radius: 4px;
        padding: 1px 5px;
        font-size: 0.88em;
        font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
    }

    pre {
        background: #1e1e2e;
        border-radius: 10px;
        padding: 14px 16px;
        margin: 8px 0;
        overflow-x: auto;

        code {
            background: transparent;
            color: #cdd6f4;
            padding: 0;
            font-size: 13px;
            line-height: 1.6;
        }
    }

    blockquote {
        margin: 8px 0;
        padding: 6px 12px;
        border-left: 3px solid #6366f1;
        background: #f5f3ff;
        border-radius: 0 6px 6px 0;
        color: #4b5563;
    }

    h1, h2, h3 {
        margin: 10px 0 6px;
        line-height: 1.3;
    }

    a { color: #4f46e5; text-decoration: underline; }

    table {
        border-collapse: collapse;
        width: 100%;
        margin: 8px 0;
        font-size: 13px;

        th, td {
            border: 1px solid #e5e7eb;
            padding: 6px 10px;
            text-align: left;
        }

        th { background: #f9fafb; font-weight: 600; }
    }
}
</style>