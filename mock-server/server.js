const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3100;
const DB_PATH = path.join(__dirname, 'workflow-db.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Auth DB ───────────────────────────────────────────────────────────────────
const AUTH_DB_PATH = path.join(__dirname, 'auth-db.json');
const DEFAULT_USERS = [
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

function readAuthDb() {
    if (!fs.existsSync(AUTH_DB_PATH)) {
        fs.writeFileSync(AUTH_DB_PATH, JSON.stringify({ users: DEFAULT_USERS }, null, 2), 'utf-8');
    }
    return JSON.parse(fs.readFileSync(AUTH_DB_PATH, 'utf-8'));
}

function writeAuthDb(data) {
    fs.writeFileSync(AUTH_DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function getUsers() { return readAuthDb().users; }

function saveUser(user) {
    const db = readAuthDb();
    const idx = db.users.findIndex(u => u.id === user.id);
    if (idx >= 0) db.users[idx] = user; else db.users.push(user);
    writeAuthDb(db);
}
// ── End Auth DB ───────────────────────────────────────────────────────────────

// ── Auth API ──────────────────────────────────────────────────────────────────
const tokens = new Map(); // token -> userId

function generateToken() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function authMiddleware(req, res, next) {
    const auth = req.headers['authorization'] || '';
    const token = auth.replace('Bearer ', '');
    if (!token || !tokens.has(token)) {
        return res.status(401).json({ code: 401, message: '未登录或登录已过期' });
    }
    req.userId = tokens.get(token);
    req.token = token;
    next();
}

app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body || {};
    const users = getUsers();
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }
    // Update login stats
    user.lastLoginAt = new Date().toISOString();
    user.stats = { ...user.stats, loginCount: (user.stats?.loginCount ?? 0) + 1 };
    saveUser(user);

    const token = generateToken();
    tokens.set(token, user.id);
    const { password: _, ...safeUser } = user;
    res.json({ code: 0, data: { token, user: safeUser } });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
    tokens.delete(req.token);
    res.json({ code: 0, message: '已退出登录' });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = getUsers().find(u => u.id === req.userId);
    if (!user) return res.status(401).json({ code: 401, message: '用户不存在' });
    const { password: _, ...safeUser } = user;
    res.json({ code: 0, data: { user: safeUser } });
});

// 注册新用户
app.post('/api/auth/register', (req, res) => {
    const { username, password, name } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ code: 400, message: '用户名和密码必填' });
    }
    const db = readAuthDb();
    if (db.users.find(u => u.username === username)) {
        return res.status(409).json({ code: 409, message: '用户名已存在' });
    }
    const newUser = {
        id: Date.now(),
        username,
        password,
        name: name || username,
        role: 'user',
        createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    writeAuthDb(db);
    const { password: _, ...safeUser } = newUser;
    res.json({ code: 0, data: { user: safeUser } });
});

// 获取所有用户（管理用）
app.get('/api/auth/users', authMiddleware, (req, res) => {
    const me = getUsers().find(u => u.id === req.userId);
    if (me?.role !== 'admin') {
        return res.status(403).json({ code: 403, message: '无权限' });
    }
    const safeUsers = getUsers().map(({ password: _, ...u }) => u);
    res.json({ code: 0, data: { users: safeUsers } });
});
// ── End Auth API ──────────────────────────────────────────────────────────────

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
// ── End SDK List API ──────────────────────────────────────────────────────────

app.listen(PORT, () => {
    console.log(`mock server running at http://localhost:${PORT}`);
});