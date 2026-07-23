const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const OpenAI = require('openai').default ?? require('openai');
const db = require('./db');

const app = express();
const PORT = 3100;
const DB_PATH = path.join(__dirname, 'workflow-db.json');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '2mb' }));

// ── Auth (本地 JSON 存储，见 ./db.js) ─────────────────────────────────────────
// 以下旧 JSON 用户定义仅保留供参考，已不再使用
const _LEGACY_USERS = [
    {
        id: 1,
        username: 'admin',
        password: '123456',
        name: '王建国',
        nickname: '老王',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=admin&backgroundColor=b6e3f4',
        email: 'wangjg@company.com',
        phone: '138****8001',
        gender: 'male',
        role: 'admin',
        department: '技术部',
        position: '系统架构师',
        bio: '10年+全栈开发经验，热爱开源，专注于AI应用开发',
        location: '上海',
        website: 'https://github.com/wangjg',
        status: 'active',
        permissions: ['user:read', 'user:write', 'user:delete', 'prompt:read', 'prompt:write', 'prompt:delete', 'system:admin'],
        tags: ['核心成员', '全栈工程师', 'AI爱好者'],
        preferences: { theme: 'light', language: 'zh-CN', notifications: true, compactMode: false },
        stats: { loginCount: 312, promptCount: 87, chatCount: 1024 },
        createdAt: '2024-01-15T08:00:00.000Z',
        lastLoginAt: null,
        updatedAt: '2025-03-10T14:22:00.000Z',
    },
    {
        id: 2,
        username: 'user',
        password: '123456',
        name: '李晓明',
        nickname: '小李',
        avatar: 'https://api.dicebear.com/9.x/avataaars/svg?seed=user&backgroundColor=ffdfbf',
        email: 'lixm@company.com',
        phone: '136****6688',
        gender: 'male',
        role: 'user',
        department: '产品部',
        position: '产品经理',
        bio: '专注于AI产品设计，热衷于探索新技术与用户体验',
        location: '北京',
        website: '',
        status: 'active',
        permissions: ['prompt:read', 'prompt:write', 'user:read'],
        tags: ['产品经理', 'AI探索者'],
        preferences: { theme: 'light', language: 'zh-CN', notifications: true, compactMode: true },
        stats: { loginCount: 45, promptCount: 12, chatCount: 89 },
        createdAt: '2024-06-01T09:30:00.000Z',
        lastLoginAt: null,
        updatedAt: '2025-04-20T11:05:00.000Z',
    },
];

// ── Token store (in-memory) ───────────────────────────────────────────────────
const tokens = new Map() // token → userId

function generateToken() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function authMiddleware(req, res, next) {
    const auth = req.headers['authorization'] || ''
    const token = auth.replace('Bearer ', '')
    // DB 不可用时进入 dev bypass：只要带了任意 token 就放行
    if (!dbAvailable && token) { req.userId = 'dev'; req.token = token; return next() }
    if (!token || !tokens.has(token)) {
        return res.status(401).json({ code: 401, message: '未登录或登录已过期' })
    }
    req.userId = tokens.get(token)
    req.token = token
    next()
}

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body || {}
        if (!username || !password)
            return res.status(400).json({ code: 400, message: '用户名和密码必填' })
        const row = await db.getUserByUsername(username)
        if (!row) return res.status(401).json({ code: 401, message: '用户名或密码错误' })
        const ok = await bcrypt.compare(String(password), row.password_hash)
        if (!ok) return res.status(401).json({ code: 401, message: '用户名或密码错误' })
        await db.updateUserLogin(row.id)
        const user = await db.getUserById(row.id)
        const token = generateToken()
        tokens.set(token, row.id)
        res.json({ code: 0, data: { token, user } })
    } catch (err) {
        console.error('[login]', err.message)
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

app.post('/api/auth/logout', authMiddleware, (req, res) => {
    tokens.delete(req.token)
    res.json({ code: 0, message: '已退出登录' })
})

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await db.getUserById(req.userId)
        if (!user) return res.status(401).json({ code: 401, message: '用户不存在' })
        res.json({ code: 0, data: { user } })
    } catch (err) {
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name } = req.body || {}
        if (!username || !password)
            return res.status(400).json({ code: 400, message: '用户名和密码必填' })
        const existing = await db.getUserByUsername(username)
        if (existing) return res.status(409).json({ code: 409, message: '用户名已存在' })
        const hash = await bcrypt.hash(String(password), 10)
        const id = await db.createUser(username, null, hash, { name: name || username })
        const user = await db.getUserById(id)
        res.json({ code: 0, data: { user } })
    } catch (err) {
        console.error('[register]', err.message)
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

app.get('/api/auth/users', authMiddleware, async (req, res) => {
    try {
        const me = await db.getUserById(req.userId)
        if (me?.role !== 'admin') return res.status(403).json({ code: 403, message: '无权限' })
        const users = await db.getAllUsers()
        res.json({ code: 0, data: { users } })
    } catch (err) {
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})
// ── End Auth (MySQL) ──────────────────────────────────────────────────────────

// ── Prompt DB ─────────────────────────────────────────────────────────────────
const PROMPT_DB_PATH = path.join(__dirname, 'prompt-db.json');
const DEFAULT_PROMPTS = [
    {
        id: 1, title: '代码审查助手', category: '开发', icon: '💻',
        description: '帮你审查代码质量，指出潜在问题并给出改进建议',
        content: '你是一位资深软件工程师，专注于代码审查。请分析用户提供的代码，指出潜在问题、安全漏洞、性能瓶颈，并给出具体的改进建议。保持专业、客观、友好。',
        createdAt: new Date().toISOString(),
    },
    {
        id: 2, title: '文案润色专家', category: '写作', icon: '✍️',
        description: '帮你优化文案表达，让文字更流畅、更有说服力',
        content: '你是一位专业的文案编辑，擅长中文写作与表达优化。请帮用户润色、修改文案，让内容更简洁流畅、表达更精准有力，保留原意的同时提升文字质量。',
        createdAt: new Date().toISOString(),
    },
    {
        id: 3, title: 'SQL 查询助手', category: '开发', icon: '🗃️',
        description: '帮你编写和优化 SQL 查询，解答数据库相关问题',
        content: '你是一位数据库专家，精通 SQL 查询优化和数据库设计。请帮用户编写高效的 SQL 语句，解释执行计划，并在必要时给出索引优化建议。默认数据库为 MySQL，用户指定时以用户为准。',
        createdAt: new Date().toISOString(),
    },
    {
        id: 4, title: '产品需求分析师', category: '产品', icon: '📋',
        description: '协助梳理产品需求，输出结构化的需求文档',
        content: '你是一位经验丰富的产品经理，擅长需求分析与文档撰写。请帮用户将模糊的想法转化为清晰的产品需求，包括用户故事、验收标准和优先级评估。以 Markdown 格式输出结构化文档。',
        createdAt: new Date().toISOString(),
    },
    {
        id: 5, title: '英语学习伙伴', category: '学习', icon: '🌍',
        description: '帮你练习英语口语、纠正语法错误，提升英语水平',
        content: '你是一位友善耐心的英语老师。请帮用户练习英语表达，纠正语法和用词错误，并解释正确用法。鼓励用户多尝试，在每次纠错后给出正确示例句。以中英双语回复。',
        createdAt: new Date().toISOString(),
    },
    {
        id: 6, title: '头脑风暴搭档', category: '创意', icon: '💡',
        description: '激发创意思维，帮你从多个角度探索问题解决方案',
        content: '你是一位富有创造力的思维伙伴。当用户提出问题或挑战时，请从多个维度提供创意方案，不限于常规思路。鼓励发散思维，同时评估各方案的可行性。保持积极、开放、充满活力的对话风格。',
        createdAt: new Date().toISOString(),
    },
];

function readPromptDb() {
    if (!fs.existsSync(PROMPT_DB_PATH)) {
        fs.writeFileSync(PROMPT_DB_PATH, JSON.stringify({ prompts: DEFAULT_PROMPTS }, null, 2), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(PROMPT_DB_PATH, 'utf-8'));
}

function writePromptDb(data) {
    fs.writeFileSync(PROMPT_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Prompt API ────────────────────────────────────────────────────────────────
app.get('/api/prompts', (req, res) => {
    const { prompts } = readPromptDb();
    res.json({ code: 0, data: { prompts } });
});

app.post('/api/prompts', authMiddleware, (req, res) => {
    const { title, description, content, category, icon } = req.body || {};
    if (!title || !content) return res.status(400).json({ code: 400, message: 'title 和 content 必填' });
    const db = readPromptDb();
    const newPrompt = {
        id: Date.now(),
        title, description: description || '', content,
        category: category || '通用', icon: icon || '🤖',
        createdAt: new Date().toISOString(),
    };
    db.prompts.push(newPrompt);
    writePromptDb(db);
    res.json({ code: 0, data: { prompt: newPrompt } });
});

app.put('/api/prompts/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    const db = readPromptDb();
    const idx = db.prompts.findIndex(p => p.id === id);
    if (idx < 0) return res.status(404).json({ code: 404, message: 'Prompt 不存在' });
    db.prompts[idx] = { ...db.prompts[idx], ...req.body, id, updatedAt: new Date().toISOString() };
    writePromptDb(db);
    res.json({ code: 0, data: { prompt: db.prompts[idx] } });
});

app.delete('/api/prompts/:id', authMiddleware, (req, res) => {
    const id = Number(req.params.id);
    const db = readPromptDb();
    db.prompts = db.prompts.filter(p => p.id !== id);
    writePromptDb(db);
    res.json({ code: 0 });
});
// ── End Prompt API ────────────────────────────────────────────────────────────

function ensureDbFile() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(
            DB_PATH,
            JSON.stringify({ workflows: [] }, null, 2),
            'utf-8'
        );
    }
}

function readDb() {
    ensureDbFile();
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    return JSON.parse(raw || '{ "workflows": [] }');
}

function writeDb(data) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEdge(source, target) {
    return {
        id: createId('edge'),
        source,
        target
    };
}

function getNodeById(workflow, id) {
    return workflow.nodes.find(node => node.id === id);
}

function removeEdge(workflow, sourceId, targetId) {
    workflow.edges = workflow.edges.filter(
        edge => !(edge.source === sourceId && edge.target === targetId)
    );
}

function updateConditionBranchRef(node, branchType, targetId) {
    if (!node || node.type !== 'condition' || !branchType) return;

    if (branchType === 'true') {
        node.config.trueBranch = targetId;
    }

    if (branchType === 'false') {
        node.config.falseBranch = targetId;
    }
}

function createStartNode() {
    return {
        id: createId('node'),
        type: 'start',
        name: '开始',
        x: 0,
        y: 0,
        width: 48,
        height: 48,
        config: {}
    };
}

function createEndNode() {
    return {
        id: createId('node'),
        type: 'end',
        name: '结束',
        x: 0,
        y: 0,
        width: 48,
        height: 48,
        config: {}
    };
}

function createApiNode(payload = {}) {
    const { label, method, templateKey } = payload;
    const name = label || 'HTTP 请求';
    const realMethod = method || 'POST';

    return {
        id: createId('node'),
        type: 'api',
        name,
        x: 0,
        y: 0,
        width: 160,
        height: 64,
        config: {
            method: realMethod,
            url: '',
            headers: {},
            params: {},
            body: {},
            mockResponse: {},
            templateKey: templateKey || ''
        }
    };
}

function createConditionNode(payload = {}) {
    const { label } = payload;
    const name = label || '条件';

    return {
        id: createId('node'),
        type: 'condition',
        name,
        x: 0,
        y: 0,
        width: 48,
        height: 48,
        config: {
            sourceNodeId: '',
            fieldPath: '',
            operator: '==',
            compareValue: '',
            trueBranch: '',
            falseBranch: ''
        }
    };
}

function createPlaceholderNode({ branchType, parentNodeId }) {
    return {
        id: createId('placeholder'),
        type: 'placeholder',
        name: '拖动或点击来添加连接器',
        x: 0,
        y: 0,
        width: 180,
        height: 72,
        parentNodeId,
        branchType
    };
}

function createDefaultWorkflow(id) {
    const startNode = createStartNode();
    const httpNode = createApiNode({
        label: 'HTTP 请求',
        method: 'POST',
        templateKey: 'default-http'
    });
    const endNode = createEndNode();

    return {
        id,
        name: '测试编排',
        nodes: [startNode, httpNode, endNode],
        edges: [
            createEdge(startNode.id, httpNode.id),
            createEdge(httpNode.id, endNode.id)
        ]
    };
}

function insertApiNode(workflow, payload) {
    const { prevNodeId, nextNodeId, branchType } = payload;

    const prevNode = prevNodeId ? getNodeById(workflow, prevNodeId) : null;
    const nextNode = nextNodeId ? getNodeById(workflow, nextNodeId) : null;

    const apiNode = createApiNode(payload);
    workflow.nodes.push(apiNode);

    if (prevNode && nextNode) {
        removeEdge(workflow, prevNode.id, nextNode.id);
        workflow.edges.push(createEdge(prevNode.id, apiNode.id));
        workflow.edges.push(createEdge(apiNode.id, nextNode.id));

        if (prevNode.type === 'condition' && branchType) {
            updateConditionBranchRef(prevNode, branchType, apiNode.id);
        }
        return;
    }

    if (prevNode) {
        removeEdge(workflow, prevNode.id, nextNode?.id);
        workflow.edges.push(createEdge(prevNode.id, apiNode.id));

        if (nextNode) {
            workflow.edges.push(createEdge(apiNode.id, nextNode.id));
        }

        if (prevNode.type === 'condition' && branchType) {
            updateConditionBranchRef(prevNode, branchType, apiNode.id);
        }
        return;
    }

    if (nextNode) {
        workflow.edges.push(createEdge(apiNode.id, nextNode.id));
    }
}

function insertConditionNode(workflow, payload) {
    const { prevNodeId, nextNodeId, branchType } = payload;

    const prevNode = prevNodeId ? getNodeById(workflow, prevNodeId) : null;
    const nextNode = nextNodeId ? getNodeById(workflow, nextNodeId) : null;

    const conditionNode = createConditionNode(payload);
    const falsePlaceholder = createPlaceholderNode({
        branchType: 'false',
        parentNodeId: conditionNode.id
    });

    workflow.nodes.push(conditionNode, falsePlaceholder);

    if (prevNode && nextNode) {
        removeEdge(workflow, prevNode.id, nextNode.id);
        workflow.edges.push(createEdge(prevNode.id, conditionNode.id));
        workflow.edges.push(createEdge(conditionNode.id, nextNode.id));
        workflow.edges.push(createEdge(conditionNode.id, falsePlaceholder.id));

        conditionNode.config.trueBranch = nextNode.id;
        conditionNode.config.falseBranch = falsePlaceholder.id;

        if (prevNode.type === 'condition' && branchType) {
            updateConditionBranchRef(prevNode, branchType, conditionNode.id);
        }
        return;
    }

    if (prevNode) {
        workflow.edges.push(createEdge(prevNode.id, conditionNode.id));

        const truePlaceholder = createPlaceholderNode({
            branchType: 'true',
            parentNodeId: conditionNode.id
        });

        workflow.nodes.push(truePlaceholder);
        workflow.edges.push(createEdge(conditionNode.id, truePlaceholder.id));
        workflow.edges.push(createEdge(conditionNode.id, falsePlaceholder.id));

        conditionNode.config.trueBranch = truePlaceholder.id;
        conditionNode.config.falseBranch = falsePlaceholder.id;

        if (prevNode.type === 'condition' && branchType) {
            updateConditionBranchRef(prevNode, branchType, conditionNode.id);
        }
        return;
    }

    if (nextNode) {
        workflow.edges.push(createEdge(conditionNode.id, nextNode.id));
        workflow.edges.push(createEdge(conditionNode.id, falsePlaceholder.id));

        conditionNode.config.trueBranch = nextNode.id;
        conditionNode.config.falseBranch = falsePlaceholder.id;
        return;
    }

    const truePlaceholder = createPlaceholderNode({
        branchType: 'true',
        parentNodeId: conditionNode.id
    });

    workflow.nodes.push(truePlaceholder);
    workflow.edges.push(createEdge(conditionNode.id, truePlaceholder.id));
    workflow.edges.push(createEdge(conditionNode.id, falsePlaceholder.id));

    conditionNode.config.trueBranch = truePlaceholder.id;
    conditionNode.config.falseBranch = falsePlaceholder.id;
}

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'mock server is running' });
});

app.get('/api/workflows/:id', (req, res) => {
    const db = readDb();
    let workflow = (db.workflows || []).find(item => item.id === req.params.id);

    if (!workflow) {
        workflow = createDefaultWorkflow(req.params.id);
        db.workflows.push(workflow);
        writeDb(db);
    }

    res.json({
        success: true,
        data: workflow
    });
});

app.put('/api/workflows/:id', (req, res) => {
    const db = readDb();
    const workflowId = req.params.id;
    const workflow = {
        ...req.body,
        id: workflowId
    };

    const index = (db.workflows || []).findIndex(item => item.id === workflowId);

    if (index > -1) {
        db.workflows[index] = workflow;
    } else {
        db.workflows.push(workflow);
    }

    writeDb(db);

    res.json({
        success: true,
        message: 'workflow saved',
        data: workflow
    });
});

app.post('/api/workflows/:id/operations', (req, res) => {
    const { id } = req.params;
    const { action, payload } = req.body;

    const db = readDb();
    let workflow = (db.workflows || []).find(item => item.id === id);

    if (!workflow) {
        workflow = createDefaultWorkflow(id);
        db.workflows.push(workflow);
    }

    if (action === 'addNode') {
        const { type } = payload || {};

        if (!type) {
            return res.status(400).json({
                success: false,
                message: 'type is required'
            });
        }

        if (type === 'api') {
            insertApiNode(workflow, payload);
        } else if (type === 'condition') {
            insertConditionNode(workflow, payload);
        } else {
            return res.status(400).json({
                success: false,
                message: `unsupported node type: ${type}`
            });
        }

        writeDb(db);

        return res.json({
            success: true,
            message: 'node added'
        });
    }

    return res.status(400).json({
        success: false,
        message: `unsupported action: ${action}`
    });
});

// ── Polling Demo API ──────────────────────────────────────────────────────────
// 模拟一个"任务"，每次 GET 推进状态，30s 后自动重置
const TASK_STATES = ['pending', 'queued', 'processing', 'processing', 'processing', 'done'];
const tasks = {};

app.post('/api/tasks', (req, res) => {
    const id = createId('task');
    tasks[id] = { id, stateIndex: 0, createdAt: Date.now(), errorCount: 0 };
    res.json({ id });
});

app.get('/api/tasks/:id/status', (req, res) => {
    const task = tasks[req.params.id];
    if (!task) return res.status(404).json({ error: 'Task not found' });

    // 每次查询随机推进 0-1 步（模拟真实异步进度）
    if (task.stateIndex < TASK_STATES.length - 1 && Math.random() > 0.4) {
        task.stateIndex++;
    }

    // 10% 概率返回错误，用于演示 retry
    if (Math.random() < 0.1) {
        task.errorCount++;
        return res.status(500).json({ error: 'Internal server error (simulated)', errorCount: task.errorCount });
    }

    const status = TASK_STATES[task.stateIndex];
    res.json({
        id: task.id,
        status,
        progress: Math.round((task.stateIndex / (TASK_STATES.length - 1)) * 100),
        message: statusMessage(status),
        updatedAt: new Date().toISOString(),
        errorCount: task.errorCount,
    });
});

app.delete('/api/tasks/:id', (req, res) => {
    delete tasks[req.params.id];
    res.json({ ok: true });
});

function statusMessage(status) {
    return { pending: '等待调度', queued: '已入队', processing: '处理中...', done: '已完成 ✓' }[status] || status;
}
// ── End Polling Demo API ──────────────────────────────────────────────────────

// ── SDK List API ──────────────────────────────────────────────────────────────
app.get('/api/sdks', (req, res) => {
    res.json({
        code: 200,
        data: [
            {
                lang: 'Java',
                icon: 'java',
                packages: [
                    {
                        id: 'mfe-state-java',
                        name: '@your-org/mfe-state-java',
                        version: '1.2.0',
                        description: 'Java 版微前端状态共享 SDK',
                        descriptionEn: 'Java SDK for micro-frontend state sharing',
                        maven: 'com.your-org:mfe-state-java:1.2.0',
                        pip: null, go: null, npm: null,
                        githubUrl: 'https://github.com/your-org/mfe-state-java',
                        docUrl: 'https://github.com/your-org/mfe-state-java#readme',
                        publishedAt: '2025-04-01',
                        changelog: ['新增全局状态订阅', '优化序列化性能'],
                        changelogEn: ['Add global state subscription', 'Optimize serialization'],
                    },
                ],
            },
            {
                lang: 'TypeScript',
                icon: 'ts',
                packages: [
                    {
                        id: 'mfe-state-ts',
                        name: '@your-org/mfe-state',
                        version: '2.0.1',
                        description: 'TypeScript 版微前端状态共享 SDK',
                        descriptionEn: 'TypeScript SDK for micro-frontend state sharing',
                        npm: 'npm install @your-org/mfe-state',
                        maven: null, pip: null, go: null,
                        githubUrl: 'https://github.com/your-org/mfe-state',
                        docUrl: 'https://github.com/your-org/mfe-state#readme',
                        publishedAt: '2025-05-10',
                        changelog: ['支持 Qiankun 沙箱模式', '修复内存泄漏'],
                        changelogEn: ['Support Qiankun sandbox mode', 'Fix memory leak'],
                    },
                ],
            },
            {
                lang: 'Python',
                icon: 'python',
                packages: [
                    {
                        id: 'mfe-state-py',
                        name: 'mfe-state-python',
                        version: '0.9.3',
                        description: 'Python 版微前端状态共享 SDK',
                        descriptionEn: 'Python SDK for micro-frontend state sharing',
                        pip: 'pip install mfe-state-python',
                        maven: null, go: null, npm: null,
                        githubUrl: 'https://github.com/your-org/mfe-state-python',
                        docUrl: 'https://github.com/your-org/mfe-state-python#readme',
                        publishedAt: '2025-03-15',
                        changelog: ['初始发布'],
                        changelogEn: ['Initial release'],
                    },
                ],
            },
        ],
    });
});
// ── Charts API ───────────────────────────────────────────────────────────────

function rng(seed) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function genDays(n, base, amp, seed) {
    const r = rng(seed);
    const data = [];
    let v = base;
    for (let i = 0; i < n; i++) {
        v = Math.max(0, v + (r() - 0.49) * amp);
        data.push(+v.toFixed(1));
    }
    return data;
}

function dateRange(startY, startM, n) {
    const dates = [];
    let y = startY, m = startM;
    for (let i = 0; i < n; i++) {
        dates.push(`${y}-${String(m).padStart(2, '0')}`);
        m++; if (m > 12) { m = 1; y++; }
    }
    return dates;
}

function dayRange(startDate, n) {
    const d = new Date(startDate), dates = [];
    for (let i = 0; i < n; i++) {
        dates.push(d.toISOString().slice(0, 10));
        d.setDate(d.getDate() + 1);
    }
    return dates;
}

const REGIONS = ['华东', '华南', '华北', '华西', '东北', '港澳台'];
const MONTHS_36 = dateRange(2023, 1, 36);
const DAYS_365 = dayRange('2024-01-01', 365);
const PRODUCTS = ['产品A', '产品B', '产品C', '产品D', '产品E', '产品F', '产品G', '产品H'];
const DEPTS = ['研发', '销售', '市场', '运营', '财务', '人事', '客服', '法务', '采购', '战略'];
const CHANNELS = ['自然搜索', '付费广告', '社交媒体', '邮件营销', '合作伙伴', 'App推送', '口碑推荐', '线下活动', '短视频', '直播'];
const SERVERS = ['server-01', 'server-02', 'server-03', 'server-04', 'server-05'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
const FUNNEL = ['曝光', '点击', '注册', '激活', '付费', '复购'];

const DAYS_5000 = dayRange('2011-01-01', 5000);
const METRICS_12 = ['营收', '成本', '利润', 'GMV', 'MAU', 'DAU', '订单量', '客单价', '退款率', '投诉量', 'NPS', '复购率'];
const CITIES_30 = ['上海', '北京', '深圳', '广州', '杭州', '成都', '重庆', '武汉', '西安', '南京', '苏州', '天津', '长沙', '郑州', '青岛', '合肥', '福州', '宁波', '厦门', '济南', '哈尔滨', '沈阳', '昆明', '大连', '贵阳', '南宁', '石家庄', '太原', '乌鲁木齐', '呼和浩特'];

// GET /api/charts/bar
app.get('/api/charts/bar', (req, res) => {
    res.json({
        regionSales: {
            months: MONTHS_36,
            series: REGIONS.map((name, i) => ({ name, data: genDays(36, 800 + i * 120, 80, i * 7 + 1) })),
        },
        productQuarter: {
            quarters: ['23Q1', '23Q2', '23Q3', '23Q4', '24Q1', '24Q2', '24Q3', '24Q4', '25Q1', '25Q2', '25Q3', '25Q4'],
            series: PRODUCTS.map((name, i) => ({ name, data: genDays(12, 200 + i * 30, 40, i * 11 + 3) })),
        },
        deptPerf: {
            depts: DEPTS,
            series: ['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => ({
                name: q,
                data: DEPTS.map((_, j) => +(60 + rng(i * 31 + j * 7)() * 40).toFixed(1)),
            })),
        },
        channelCost: {
            channels: CHANNELS,
            costs: CHANNELS.map((_, i) => +(20 + rng(i * 13 + 5)() * 180).toFixed(0)),
            conversions: CHANNELS.map((_, i) => +(2 + rng(i * 17 + 9)() * 28).toFixed(1)),
        },
        funnel: { stages: FUNNEL, values: [980000, 342000, 87600, 61200, 18400, 9800] },
        churn: {
            months: MONTHS_36.slice(24),
            newUsers: genDays(12, 12000, 2000, 41),
            lostUsers: genDays(12, 4000, 800, 73),
        },
        // 新增：30 城市月销售热力柱
        cityMonth: {
            cities: CITIES_30,
            months: MONTHS_36,
            series: CITIES_30.map((name, i) => ({ name, data: genDays(36, 300 + i * 20, 60, i * 9 + 2) })),
        },
        // 新增：12 指标 24 月趋势对比柱
        metricTrend: {
            months: MONTHS_36.slice(12),
            series: METRICS_12.map((name, i) => ({ name, data: genDays(24, 100 + i * 15, 20, i * 13 + 7) })),
        },
    });
});

// GET /api/charts/line
app.get('/api/charts/line', (req, res) => {
    res.json({
        // 5000 天 × 12 指标折线（主卡顿源）
        bigMetrics: {
            days: DAYS_5000,
            series: METRICS_12.map((name, i) => ({
                name,
                data: genDays(5000, 1000 + i * 80, 120, i * 37 + 3),
            })),
        },
        userActivity: {
            days: DAYS_365,
            dau: genDays(365, 28000, 3000, 11),
            wau: genDays(365, 95000, 5000, 22),
            mau: genDays(365, 310000, 8000, 33),
        },
        // 30 城市 365 天折线
        cityActivity: {
            days: DAYS_365,
            series: CITIES_30.map((name, i) => ({
                name,
                data: genDays(365, 5000 + i * 200, 800, i * 41 + 5),
            })),
        },
        serverLoad: {
            hours: HOURS,
            series: SERVERS.map((name, i) => ({
                name,
                data: HOURS.map((_, h) => {
                    const peak = (h >= 9 && h <= 12) || (h >= 14 && h <= 18) ? 1.4 : 0.6;
                    return +(20 + rng(i * 100 + h)() * 60 * peak).toFixed(1);
                }),
            })),
        },
        finance: {
            months: MONTHS_36,
            revenue: genDays(36, 5000, 500, 51),
            cost: genDays(36, 3200, 300, 61),
            profit: genDays(36, 1800, 200, 71),
        },
        latency: {
            days: DAYS_365.slice(0, 90),
            p50: genDays(90, 45, 8, 81),
            p95: genDays(90, 180, 30, 91),
            p99: genDays(90, 420, 80, 101),
        },
        retention: {
            weeks: Array.from({ length: 52 }, (_, i) => `W${i + 1}`),
            d1: genDays(52, 68, 5, 111),
            d7: genDays(52, 32, 4, 122),
            d30: genDays(52, 14, 3, 133),
        },
        // 5000 天 × 6 区域面积折线
        regionTrend: {
            days: DAYS_5000,
            series: REGIONS.map((name, i) => ({
                name,
                data: genDays(5000, 2000 + i * 300, 400, i * 53 + 11),
            })),
        },
    });
});

// GET /api/charts/pie
app.get('/api/charts/pie', (req, res) => {
    res.json({
        marketShare: {
            data: ['云计算', 'AI服务', 'SaaS', 'PaaS', 'IaaS', '安全', '存储', '网络', '数据库', '中间件', 'DevOps', '监控', 'CDN', 'IoT', '区块链'].map((name, i) => ({
                name, value: +(3 + rng(i * 19 + 7)() * 22).toFixed(1),
            })),
        },
        trafficSource: {
            data: CHANNELS.map((name, i) => ({ name, value: +(5 + rng(i * 23 + 11)() * 35).toFixed(1) })),
        },
        deviceDist: {
            data: [
                { name: 'iOS App', value: 31.4 }, { name: 'Android App', value: 28.7 },
                { name: 'PC Web', value: 22.1 }, { name: 'Mobile Web', value: 12.3 },
                { name: 'Mac Web', value: 3.8 }, { name: 'Mini Program', value: 1.7 },
            ],
        },
        userTier: {
            data: [
                { name: '免费', value: 58.2 }, { name: '基础版', value: 21.4 },
                { name: '专业版', value: 12.7 }, { name: '企业版', value: 5.9 },
                { name: '旗舰版', value: 1.8 },
            ],
        },
        // 新增：30 城市份额饼
        cityShare: {
            data: CITIES_30.map((name, i) => ({ name, value: +(1 + rng(i * 31 + 13)() * 8).toFixed(1) })),
        },
        // 新增：12 指标占比饼
        metricShare: {
            data: METRICS_12.map((name, i) => ({ name, value: +(3 + rng(i * 17 + 7)() * 15).toFixed(1) })),
        },
    });
});

// ── End Charts API ────────────────────────────────────────────────────────────

// ── Conversations (MySQL, auth required) ──────────────────────────────────────
app.get('/api/conversations', authMiddleware, async (req, res) => {
    try {
        const list = await db.getUserConversations(req.userId)
        res.json({ conversations: list })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

app.post('/api/conversations', authMiddleware, async (req, res) => {
    try {
        const conv = await db.createConversation(req.userId, req.body?.title)
        res.json({ conversation: conv })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

app.get('/api/conversations/:id', authMiddleware, async (req, res) => {
    try {
        const conv = await db.getConversation(req.params.id, req.userId)
        if (!conv) return res.status(404).json({ error: 'not found' })
        res.json({ conversation: conv })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

app.patch('/api/conversations/:id', authMiddleware, async (req, res) => {
    try {
        const { title } = req.body || {}
        if (title) await db.updateConversationTitle(req.params.id, title, req.userId)
        const conv = await db.getConversation(req.params.id, req.userId)
        if (!conv) return res.status(404).json({ error: 'not found' })
        res.json({ conversation: conv })
    } catch (err) { res.status(500).json({ error: err.message }) }
})

app.delete('/api/conversations/:id', authMiddleware, async (req, res) => {
    try {
        const ok = await db.deleteConversation(req.params.id, req.userId)
        if (!ok) return res.status(404).json({ error: 'not found' })
        res.status(204).end()
    } catch (err) { res.status(500).json({ error: err.message }) }
})

// 前端直连 LM Studio 后，将本轮对话存档
app.post('/api/conversations/:id/messages', authMiddleware, async (req, res) => {
    try {
        const conv = await db.getConversation(req.params.id, req.userId)
        if (!conv) return res.status(404).json({ error: 'not found' })
        const { userMessage, assistantMessage } = req.body
        if (userMessage) await db.addMessage(req.params.id, 'user', userMessage)
        if (assistantMessage) await db.addMessage(req.params.id, 'assistant', assistantMessage)
        // 第一次对话时用用户消息内容做标题
        if (conv.messageCount === 0 && userMessage) {
            const title = userMessage.slice(0, 40) + (userMessage.length > 40 ? '…' : '')
            await db.updateConversationTitle(req.params.id, title, req.userId)
        }
        const updated = await db.getConversation(req.params.id, req.userId)
        res.json({ conversation: updated })
    } catch (err) { res.status(500).json({ error: err.message }) }
})
// ── End Conversations ─────────────────────────────────────────────────────────

// ── Feedback ──────────────────────────────────────────────────────────────────
// POST /api/feedback  — 提交/更新反馈
app.post('/api/feedback', authMiddleware, async (req, res) => {
    try {
        const { messageId, feedbackType, reasonTags, comment, userQuery, aiResponse, conversationId } = req.body || {}
        if (!messageId || feedbackType === undefined)
            return res.status(400).json({ code: 400, message: 'messageId 和 feedbackType 必填' })
        if (![1, -1].includes(Number(feedbackType)))
            return res.status(400).json({ code: 400, message: 'feedbackType 只能为 1(点赞) 或 -1(点踩)' })
        await db.upsertFeedback(messageId, req.userId, Number(feedbackType), {
            reasonTags, comment, userQuery, aiResponse, conversationId: conversationId ? Number(conversationId) : null,
        })
        res.json({ code: 0, message: '反馈已记录' })
    } catch (err) {
        console.error('[feedback:post]', err.message)
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

// DELETE /api/feedback/:messageId  — 取消反馈
app.delete('/api/feedback/:messageId', authMiddleware, async (req, res) => {
    try {
        const ok = await db.deleteFeedback(req.params.messageId, req.userId)
        if (!ok) return res.status(404).json({ code: 404, message: '反馈不存在' })
        res.json({ code: 0, message: '反馈已取消' })
    } catch (err) {
        console.error('[feedback:delete]', err.message)
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

// GET /api/feedback/stats  — 统计
app.get('/api/feedback/stats', authMiddleware, async (req, res) => {
    try {
        const { conversationId } = req.query
        const stats = await db.getFeedbackStats(req.userId, conversationId ? Number(conversationId) : null)
        res.json({ code: 0, data: stats })
    } catch (err) {
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})

// GET /api/feedback/messages?ids=id1,id2,...  — 批量获取消息的反馈状态
app.get('/api/feedback/messages', authMiddleware, async (req, res) => {
    try {
        const ids = (req.query.ids || '').split(',').map(s => s.trim()).filter(Boolean)
        const map = await db.getMessageFeedback(ids, req.userId)
        res.json({ code: 0, data: map })
    } catch (err) {
        res.status(500).json({ code: 500, message: '服务器错误' })
    }
})
// ── End Feedback ──────────────────────────────────────────────────────────────

// ── AI endpoints (LM Studio, 合并自 ai-server.js) ─────────────────────────────
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

function lmClient() {
    return new OpenAI({
        apiKey: 'lm-studio',
        baseURL: process.env.LM_STUDIO_BASE_URL || 'http://192.168.31.203:1234/v1',
    })
}

function sseSetup(res) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
}

function sseSend(res, data) {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
}

app.post('/api/score', async (req, res) => {
    const { history = [], resume } = req.body
    sseSetup(res)
    try {
        if (!history.length) {
            sseSend(res, { type: 'error', message: '没有可评分的对话记录' })
            return res.end()
        }
        const historyText = history
            .map(m => `${m.role === 'user' ? '候选人' : '面试官'}: ${m.content}`)
            .join('\n\n')
        const model = process.env.LM_STUDIO_MODEL || 'deepseek/deepseek-r1-0528-qwen3-8b'
        const stream = await lmClient().chat.completions.create({
            model,
            messages: [
                { role: 'system', content: SCORE_SYSTEM },
                { role: 'user', content: `请评分：\n\n${historyText}${resume ? `\n\n简历：\n${resume}` : ''}` },
            ],
            stream: true, temperature: 0.2, max_tokens: 1024,
        })
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? ''
            if (delta) sseSend(res, { type: 'text', content: delta })
        }
        sseSend(res, { type: 'done' })
        res.end()
    } catch (err) {
        console.error('[score]', err.message)
        sseSend(res, { type: 'error', message: err.message })
        res.end()
    }
})

app.get('/api/provider', (_req, res) => {
    res.json({
        provider: 'LM Studio',
        model: process.env.LM_STUDIO_MODEL || 'deepseek/deepseek-r1-0528-qwen3-8b',
        baseURL: process.env.LM_STUDIO_BASE_URL || 'http://192.168.31.203:1234/v1',
    })
})
// ── Chat Stream Proxy ─────────────────────────────────────────────────────────
// POST /api/chat/stream  — 代理转发至 LM Studio，需要认证
// chunk 原样透传：前端 pickText 自行处理 delta.reasoning_content / delta.content
app.post('/api/chat/stream', authMiddleware, async (req, res) => {
    const ac = new AbortController()
    req.on('close', () => ac.abort())

    const { model, messages, temperature, max_tokens, top_p } = req.body || {}
    if (!Array.isArray(messages) || !messages.length)
        return res.status(400).json({ error: 'messages 不能为空' })

    sseSetup(res)

    try {
        const stream = await lmClient().chat.completions.create(
            {
                model: model || process.env.LM_STUDIO_MODEL || 'deepseek/deepseek-r1-0528-qwen3-8b',
                messages,
                stream: true,
                temperature: temperature ?? 0.7,
                max_tokens: max_tokens ?? 8192,
                ...(top_p !== undefined ? { top_p } : {}),
            },
            { signal: ac.signal }
        )
        for await (const chunk of stream) {
            if (res.writableEnded) break
            res.write(`data: ${JSON.stringify(chunk)}\n\n`)
        }
        if (!res.writableEnded) {
            res.write('data: [DONE]\n\n')
            res.end()
        }
    } catch (err) {
        if (ac.signal.aborted) {
            if (!res.writableEnded) res.end()
            return
        }
        console.error('[chat/stream]', err.message)
        if (!res.writableEnded) {
            res.write('data: [DONE]\n\n')
            res.end()
        }
    }
})
// ── End AI endpoints ──────────────────────────────────────────────────────────

let dbAvailable = false

async function start() {
    try {
        await db.initDb()
        dbAvailable = true
        console.log('  ✓ 本地 JSON 存储已就绪（mock-server/local-db.json）')
    } catch (err) {
        console.error('✗ 本地存储初始化失败:', err.message)
        console.warn('  ⚠ 以无数据库模式启动（登录/用户接口不可用，chat/stream 可正常使用）')
    }
    app.listen(PORT, () => {
        console.log(`mock server → http://localhost:${PORT}`)
    })
}

start()