require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const fs      = require('fs')
const path    = require('path')
const crypto  = require('crypto')
const OpenAI  = require('openai').default ?? require('openai')

const app  = express()
const PORT = 3200

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type'] }))
app.use(express.json({ limit: '4mb' }))

// ── Provider ──────────────────────────────────────────────────────────────────
function createClient() {
    const useCloud = process.env.USE_CLOUD_FALLBACK === 'true'

    // ── 优先：LM Studio 本地部署 ──────────────────────────────────────────────
    if (!useCloud) {
        const baseURL = process.env.LM_STUDIO_BASE_URL || 'http://192.168.31.203:1234/v1'
        const model   = process.env.LM_STUDIO_MODEL    || 'google/gemma-3-4b'
        return {
            client: new OpenAI({ apiKey: 'lm-studio', baseURL }),
            model,
            provider: 'LM Studio',
        }
    }

    // ── 备用：云端（USE_CLOUD_FALLBACK=true 时生效）──────────────────────────
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
    throw new Error('云端备用模式下未配置 GROQ_API_KEY 或 SILICONFLOW_API_KEY')
}

// ── Conversation DB（JSON 文件持久化）────────────────────────────────────────
const CONV_DB = path.join(__dirname, 'conversations-db.json')

function loadDb() {
    if (!fs.existsSync(CONV_DB)) return {}
    try { return JSON.parse(fs.readFileSync(CONV_DB, 'utf8')) } catch { return {} }
}
function saveDb(db) {
    fs.writeFileSync(CONV_DB, JSON.stringify(db, null, 2))
}

// GET /api/conversations
app.get('/api/conversations', (_req, res) => {
    const db = loadDb()
    const list = Object.values(db)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .map(({ id, title, createdAt, updatedAt, messages }) => ({
            id, title, createdAt, updatedAt, messageCount: messages.length,
        }))
    res.json({ conversations: list })
})

// POST /api/conversations  → 新建
app.post('/api/conversations', (req, res) => {
    const db = loadDb()
    const id  = crypto.randomUUID()
    const now = Date.now()
    db[id] = { id, title: req.body?.title || '新对话', createdAt: now, updatedAt: now, messages: [] }
    saveDb(db)
    res.json({ conversation: db[id] })
})

// GET /api/conversations/:id
app.get('/api/conversations/:id', (req, res) => {
    const db   = loadDb()
    const conv = db[req.params.id]
    if (!conv) return res.status(404).json({ error: 'not found' })
    res.json({ conversation: conv })
})

// PATCH /api/conversations/:id  → 改标题
app.patch('/api/conversations/:id', (req, res) => {
    const db   = loadDb()
    const conv = db[req.params.id]
    if (!conv) return res.status(404).json({ error: 'not found' })
    if (req.body?.title) conv.title = req.body.title
    conv.updatedAt = Date.now()
    saveDb(db)
    res.json({ conversation: conv })
})

// DELETE /api/conversations/:id
app.delete('/api/conversations/:id', (req, res) => {
    const db = loadDb()
    if (!db[req.params.id]) return res.status(404).json({ error: 'not found' })
    delete db[req.params.id]
    saveDb(db)
    res.status(204).end()
})

// POST /api/conversations/:id/messages  → 前端直连 LM Studio 后追加存档
app.post('/api/conversations/:id/messages', (req, res) => {
    const db   = loadDb()
    const conv = db[req.params.id]
    if (!conv) return res.status(404).json({ error: 'not found' })
    const { userMessage, assistantMessage } = req.body
    const now = Date.now()
    if (userMessage)      conv.messages.push({ id: crypto.randomUUID(), role: 'user',      content: userMessage,      createdAt: now })
    if (assistantMessage) conv.messages.push({ id: crypto.randomUUID(), role: 'assistant', content: assistantMessage, createdAt: now + 1 })
    if (conv.messages.length <= 2 && userMessage) {
        conv.title = userMessage.slice(0, 40) + (userMessage.length > 40 ? '…' : '')
    }
    conv.updatedAt = Date.now()
    saveDb(db)
    res.json({ conversation: conv })
})

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

// ── POST /v1/chat/completions（OpenAI-compatible passthrough） ─────────────────
app.post('/v1/chat/completions', async (req, res) => {
    const { messages, temperature, max_tokens } = req.body
    if (!messages?.length) return res.status(400).json({ error: 'messages is required' })

    sseSetup(res)

    try {
        const { client, model } = createClient()
        const stream = await client.chat.completions.create({
            model, messages, stream: true,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 1024,
        })
        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        }
        res.write('data: [DONE]\n\n')
        res.end()
    } catch (err) {
        console.error('[completions error]', err.message)
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
        res.end()
    }
})

// ── POST /api/chat ────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
    const {
        message, history = [], resume,
        stage = 'warmup', mode = 'free',
        sessionId, systemPrompt,
        conversationId,           // ← 新增：关联对话 ID
    } = req.body

    if (!message) return res.status(400).json({ error: 'message is required' })

    sseSetup(res)

    // 如果传了 conversationId，从数据库读取历史
    let conv = null
    let contextHistory = history
    if (conversationId) {
        const db = loadDb()
        conv = db[conversationId]
        if (conv) {
            contextHistory = conv.messages.map(m => ({ role: m.role, content: m.content }))
        }
    }

    try {
        const { client, model, provider } = createClient()

        let sessionHistory = []
        if (sessionId) {
            if (!sessions.has(sessionId)) sessions.set(sessionId, [])
            sessionHistory = sessions.get(sessionId)
        }

        if (!conversationId) contextHistory = sessionId ? sessionHistory : history
        const sysPrompt = buildSystemPrompt(mode, stage, resume, systemPrompt)

        const llmMessages = [
            { role: 'system', content: sysPrompt },
            ...contextHistory,
            { role: 'user', content: message },
        ]

        console.log(`[${provider}] ${model} | mode=${mode} stage=${stage} conv=${conversationId ?? '-'} history=${contextHistory.length}`)

        const stream = await client.chat.completions.create({
            model, messages: llmMessages, stream: true, temperature: 0.7, max_tokens: 1024,
        })

        let fullContent = ''
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (delta) {
                fullContent += delta
                sseSend(res, { type: 'text', content: delta })
            }
        }

        // 存储到对话数据库
        if (conversationId && conv) {
            const db = loadDb()
            const c  = db[conversationId]
            if (c) {
                const now = Date.now()
                c.messages.push({ id: crypto.randomUUID(), role: 'user',      content: message,     createdAt: now })
                c.messages.push({ id: crypto.randomUUID(), role: 'assistant', content: fullContent,  createdAt: now + 1 })
                // 第一条消息时用其内容做标题
                if (c.messages.length === 2) {
                    c.title = message.slice(0, 40) + (message.length > 40 ? '…' : '')
                }
                c.updatedAt = now
                saveDb(db)
            }
        }

        if (sessionId && !conversationId) {
            sessionHistory.push({ role: 'user', content: message })
            sessionHistory.push({ role: 'assistant', content: fullContent })
        }

        sseSend(res, { type: 'done' })
        res.end()
    } catch (err) {
        console.error('[chat error]', err.message)
        if (err.status === 403 || err.status === 401 || process.env.USE_MOCK === 'true') {
            const mock = `（模拟回复）收到你的消息："${message}"。\n\n当前 API Key 无效（${err.message}）。\n请在 \`.env\` 中更新 **GROQ_API_KEY** 或 **SILICONFLOW_API_KEY** 后重启服务。`

            // mock 模式也要存储
            if (conversationId && conv) {
                const db = loadDb()
                const c  = db[conversationId]
                if (c) {
                    const now = Date.now()
                    c.messages.push({ id: crypto.randomUUID(), role: 'user',      content: message, createdAt: now })
                    c.messages.push({ id: crypto.randomUUID(), role: 'assistant', content: mock,     createdAt: now + 1 })
                    if (c.messages.length === 2) c.title = message.slice(0, 40) + (message.length > 40 ? '…' : '')
                    c.updatedAt = now
                    saveDb(db)
                }
            }

            for (const ch of mock) {
                sseSend(res, { type: 'text', content: ch })
                await new Promise(r => setTimeout(r, 18))
            }
            sseSend(res, { type: 'done' })
            return res.end()
        }
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
    const useCloud = process.env.USE_CLOUD_FALLBACK === 'true'
    if (!useCloud) {
        const baseURL = process.env.LM_STUDIO_BASE_URL || 'http://192.168.31.203:1234/v1'
        const model   = process.env.LM_STUDIO_MODEL    || 'google/gemma-3-4b'
        console.log(`AI server → http://localhost:${PORT}`)
        console.log(`  ✓ LM Studio  ${baseURL}  model=${model}`)
    } else {
        const groq = process.env.GROQ_API_KEY       ? '✓ Groq'        : '✗ Groq (未配置)'
        const sf   = process.env.SILICONFLOW_API_KEY ? '✓ SiliconFlow' : '✗ SiliconFlow (未配置)'
        console.log(`AI server → http://localhost:${PORT}  [cloud fallback]`)
        console.log(`  ${groq}`)
        console.log(`  ${sf}`)
    }
})
