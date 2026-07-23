<template>
    <div class="md" v-html="content" @click="onClick"></div>
</template>

<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import { computed } from 'vue';

const props = defineProps<{
    content: string;
    streaming: boolean
}>()


function escapeHtml(s: string): string {
    return s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
}

const md = new MarkdownIt({
    html: false,   // 不允许 Markdown 里直接写 HTML（更安全）
    linkify: true,
    breaks: true,
    // 代码块高亮：指定语言就按语言高亮，否则自动识别；失败则回退为纯文本
    highlight(str: string, lang: string): string {
        let body: string
        try {
            body = lang && hljs.getLanguage(lang)
                ? hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
                : hljs.highlightAuto(str).value
        } catch {
            body = escapeHtml(str)
        }
        return `<pre class="md-code"><div class="md-code-bar">`
            + `<span class="md-code-lang">${escapeHtml(lang || 'text')}</span>`
            + `<button type="button" class="md-code-copy">复制</button>`
            + `</div><code class="hljs">${body}</code></pre>`
    },
})

// 代码块复制按钮走事件委托（内容是 v-html 渲染的，没法直接绑事件）
function onClick(e: MouseEvent) {
    const btn = (e.target as HTMLElement).closest('.md-code-copy') as HTMLButtonElement | null
    if (!btn) return
    const code = btn.closest('.md-code')?.querySelector('code')?.textContent ?? ''
    navigator.clipboard.writeText(code).then(() => {
        btn.textContent = '已复制'
        setTimeout(() => { btn.textContent = '复制' }, 1500)
    })
}

// 把 <think>...</think> 提取出来用折叠块包起来，其余内容走 markdown 渲染
// - 未闭合（流式中）：渲染已收到的部分，加 think-block--open 标记
// - 已闭合：渲染内部 markdown 后包进 think-block
function renderWithThink(raw: string): string {
    if (!raw) return ''
    let out = ''
    let rest = raw
    while (rest.length) {
        const start = rest.indexOf('<think>')
        if (start < 0) {
            out += md.render(rest)
            break
        }
        out += md.render(rest.slice(0, start))
        rest = rest.slice(start + '<think>'.length)
        const end = rest.indexOf('</think>')
        if (end < 0) {
            out += `<div class="think-block think-block--open"><div class="think-label">思考中…</div>${md.render(rest)}</div>`
            break
        }
        out += `<div class="think-block"><div class="think-label">已深度思考</div>${md.render(rest.slice(0, end))}</div>`
        rest = rest.slice(end + '</think>'.length)
    }
    return out
}

const content = computed(() => renderWithThink(props.content))


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

    // ── 带语言标签 + 复制按钮的围栏代码块 ──────────────────────────────
    pre.md-code {
        padding: 0;
        overflow: hidden;

        .md-code-bar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 5px 10px 5px 14px;
            background: rgba(255, 255, 255, 0.04);
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .md-code-lang {
            font-size: 11px;
            color: #9399b2;
            font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
        }

        .md-code-copy {
            border: none;
            background: transparent;
            color: #9399b2;
            font-size: 11px;
            padding: 3px 8px;
            border-radius: 5px;
            cursor: pointer;
            transition: background 0.12s, color 0.12s;

            &:hover {
                background: rgba(255, 255, 255, 0.09);
                color: #cdd6f4;
            }
        }

        code.hljs {
            display: block;
            background: transparent;
            color: #cdd6f4;
            padding: 12px 16px;
            font-size: 13px;
            line-height: 1.6;
            overflow-x: auto;
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

    // ── DeepSeek R1 思考块 ─────────────────────────────────────────────
    .think-block {
        margin: 6px 0 10px;
        padding: 10px 12px;
        background: #f8fafc;
        border-left: 3px solid #cbd5e1;
        border-radius: 0 6px 6px 0;
        color: #64748b;
        font-size: 13px;
        line-height: 1.65;

        p { margin: 0 0 6px; &:last-child { margin-bottom: 0; } }
    }
    .think-label {
        display: inline-block;
        margin-bottom: 6px;
        padding: 1px 8px;
        font-size: 11px;
        line-height: 1.5;
        color: #64748b;
        background: #e2e8f0;
        border-radius: 10px;
    }
    .think-block--open {
        border-left-color: #6366f1;
        background: #eef2ff;
        color: #4338ca;

        .think-label {
            background: #c7d2fe;
            color: #4338ca;
        }
    }
}
</style>
