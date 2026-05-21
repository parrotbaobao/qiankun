require('dotenv').config()
const express = require('express')
const cors = require('cors')
const OpenAI = require('openai').default ?? require('openai')

const app = express()
const PORT = 3200

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'], allowedHeaders: ['Content-Type'] }))
app.use(express.json({ limit: '4mb' }))

// ── Provider ──────────────────────────────────────────────────────────────────
function createClient() {
    if (process.env.GROQ_API_KEY) {
        return {
            client: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' }),
            model: 'llama-3.3-70b-versatile',
            provider: 'Groq',
        }
    }
    if (process.env.SILICONFLOW_API_KEY) {
        return {
            client: new OpenAI({ apiKey: process.env.SILICONFLOW_API_KEY, baseURL: 'https://api.siliconflow.cn/v1' }),
            model: 'deepseek-ai/DeepSeek-V3',
            provider: 'SiliconFlow',
        }
    }
    throw new Error('未配置 API Key，请在 .env 中设置 GROQ_API_KEY 或 SILICONFLOW_API_KEY')
}

// ── Session store ─────────────────────────────────────────────────────────────
const sessions = new Map()

// ── System prompts ────────────────────────────────────────────────────────────
const FREE_PROMPTS = {
    warmup:      '你是专业前端面试官。当前是热身阶段，问几个轻松的问题，让候选人放松，了解基本情况。',
    javascript:  '你是专业前端面试官。当前考察 JavaScript 核心：闭包、原型链、异步、Event Loop、ES6+ 等。',
    vue:         '你是专业前端面试官。当前考察 Vue.js：响应式原理、生命周期、组件通信、Pinia、Vue Router 等。',
    engineering: '你是专业前端面试官。当前考察前端工程化：Webpack/Vite、性能优化、CI/CD、代码规范等。',
    algorithm:   '你是专业前端面试官。当前考察算法与数据结构，请出一道适合前端工程师的算法题。',
    closing:     '你是专业前端面试官。面试即将结束，总结面试情况，礼貌询问候选人是否有问题。',
}

const STRUCTURED_PROMPTS = {
    intro:     '你是专业前端面试官。当前阶段：自我介绍。引导候选人做自我介绍，了解背景和经历。',
    project:   '你是专业前端面试官。当前阶段：项目经历。深入询问项目细节、技术难点与解决方案。',
    knowledge: '你是专业前端面试官。当前阶段：技术知识。考察前端技术深度，包括框架原理、性能优化等。',
    scenario:  '你是专业前端面试官。当前阶段：场景题。给出实际工作场景，考察解决问题的能力。',
    closing:   '你是专业前端面试官。当前阶段：收尾。礼貌结束面试，询问候选人是否有问题。',
}

function buildSystemPrompt(mode, stage, resume, systemPrompt) {
    if (systemPrompt) return systemPrompt
    if (mode === 'resume' && resume) {
        return `你是一位专业前端技术面试官。以下是候选人的简历：\n\n${resume}\n\n请根据简历进行针对性面试，关注实际项目经验和技术能力。`
    }
    if (mode === 'structured') return STRUCTURED_PROMPTS[stage] || STRUCTURED_PROMPTS.intro
    return FREE_PROMPTS[stage] || '你是专业前端面试官，正在进行技术面试。'
}

const SCORE_SYSTEM = `你是资深前端技术面试官，请对面试对话进行客观评分。
严格输出如下 JSON，不要有任何其他文字：
{
  "dimensions": { "technical": 0-100, "communication": 0-100, "project_depth": 0-100, "thinking": 0-100 },
  "score": 0-100,
  "level": "junior|mid|senior|expert",
  "summary": "总体评价",
  "strengths": ["优势1", "优势2"],
  "weaknesses": ["不足1", "不足2"],
  "suggestions": ["建议1", "建议2"]
}`

// ── SSE helpers ───────────────────────────────────────────────────────────────
function sseSetup(res) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
}

function sseSend(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
}

// ── POST /api/chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const {
        message, history = [], resume,
        stage = 'warmup', mode = 'free',
        sessionId, systemPrompt,
    } = req.body

    if (!message) return res.status(400).json({ error: 'message is required' })

    sseSetup(res)

    try {
        const { client, model, provider } = createClient()

        let sessionHistory = []
        if (sessionId) {
            if (!sessions.has(sessionId)) sessions.set(sessionId, [])
            sessionHistory = sessions.get(sessionId)
        }

        const contextHistory = sessionId ? sessionHistory : history
        const sysPrompt = buildSystemPrompt(mode, stage, resume, systemPrompt)

        const messages = [
            { role: 'system', content: sysPrompt },
            ...contextHistory,
            { role: 'user', content: message },
        ]

        console.log(`[${provider}] ${model} | mode=${mode} stage=${stage} history=${contextHistory.length}`)

        const stream = await client.chat.completions.create({
            model, messages, stream: true, temperature: 0.7, max_tokens: 1024,
        })

        let fullContent = ''
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (delta) {
                fullContent += delta
                sseSend(res, { type: 'text', content: delta })
            }
        }

        if (sessionId) {
            sessionHistory.push({ role: 'user', content: message })
            sessionHistory.push({ role: 'assistant', content: fullContent })
        }

        sseSend(res, { type: 'done' })
        res.end()
    } catch (err) {
        console.error('[chat error]', err.message)
        sseSend(res, { type: 'error', message: err.message })
        res.end()
    }
})

// ── POST /api/score ───────────────────────────────────────────────────────────
app.post('/api/score', async (req, res) => {
    const { history = [], resume, sessionId } = req.body

    sseSetup(res)

    try {
        const { client, model } = createClient()

        const targetHistory = (sessionId && sessions.has(sessionId))
            ? sessions.get(sessionId)
            : history

        if (!targetHistory.length) {
            sseSend(res, { type: 'error', message: '没有可评分的对话记录' })
            return res.end()
        }

        const historyText = targetHistory
            .map(m => `${m.role === 'user' ? '候选人' : '面试官'}: ${m.content}`)
            .join('\n\n')

        const messages = [
            { role: 'system', content: SCORE_SYSTEM },
            {
                role: 'user',
                content: `请评分：\n\n${historyText}${resume ? `\n\n简历：\n${resume}` : ''}`,
            },
        ]

        const stream = await client.chat.completions.create({
            model, messages, stream: true, temperature: 0.2, max_tokens: 1024,
        })

        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (delta) sseSend(res, { type: 'text', content: delta })
        }

        sseSend(res, { type: 'done' })
        res.end()
    } catch (err) {
        console.error('[score error]', err.message)
        sseSend(res, { type: 'error', message: err.message })
        res.end()
    }
})

// ── GET /api/provider ─────────────────────────────────────────────────────────
app.get('/api/provider', (_req, res) => {
    try {
        const { provider, model } = createClient()
        res.json({ provider, model })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
})

app.listen(PORT, () => {
    const groq = process.env.GROQ_API_KEY ? '✓ Groq' : '✗ Groq (未配置)'
    const sf   = process.env.SILICONFLOW_API_KEY ? '✓ SiliconFlow' : '✗ SiliconFlow (未配置)'
    console.log(`AI server → http://localhost:${PORT}`)
    console.log(`  ${groq}`)
    console.log(`  ${sf}`)
})
