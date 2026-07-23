// 本地 JSON 文件存储（替代 MySQL）
// 对外导出的函数签名与返回结构与原 MySQL 版完全一致，server.js 无需改动。
//
// 数据落盘于 local-db.json，结构：
//   { _seq: {users,conversations,messages,feedback}, users, conversations, messages, feedback }
// 时间戳统一存 ISO 字符串（与原先 MySQL TIMESTAMP 经 JSON 序列化后的形态一致）。

const fs     = require('fs')
const path   = require('path')
const bcrypt = require('bcryptjs')

const DB_FILE = path.join(__dirname, 'local-db.json')

const EMPTY = {
    _seq:          { users: 0, conversations: 0, messages: 0, feedback: 0 },
    users:         [],
    conversations: [],
    messages:      [],
    feedback:      [],
}

// ── 读写 ──────────────────────────────────────────────────────────────────────
// Node 单线程 + 同步读写，read→modify→write 之间无 await，等价于串行事务。
function load() {
    if (!fs.existsSync(DB_FILE)) return structuredClone(EMPTY)
    try {
        const raw = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
        return { ...structuredClone(EMPTY), ...raw, _seq: { ...EMPTY._seq, ...(raw._seq || {}) } }
    } catch {
        return structuredClone(EMPTY)
    }
}

function save(db) {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

/** 自增主键，复刻 MySQL AUTO_INCREMENT */
function nextId(db, table) {
    db._seq[table] = (db._seq[table] || 0) + 1
    return db._seq[table]
}

const now = () => new Date().toISOString()

/** id 宽松比较：URL param 是字符串，存储是数字，复刻 MySQL 的隐式类型转换 */
const sameId = (a, b) => String(a) === String(b)

// ── 建表 & 播种 ───────────────────────────────────────────────────────────────
async function initDb() {
    const db = load()

    if (db.users.length === 0) {
        const SEEDS = [
            {
                username: 'admin', password: '123456', name: '王建国', nickname: '老王',
                email: 'wangjg@company.com',
                avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=admin&backgroundColor=b6e3f4',
                role: 'admin', phone: '138****8001', gender: 'male',
                department: '技术部', position: '系统架构师',
                bio: '10年+全栈开发经验，热爱开源，专注于AI应用开发',
                location: '上海', website: 'https://github.com/wangjg', status: 'active',
                permissions: ['user:read','user:write','user:delete','prompt:read','prompt:write','prompt:delete','system:admin'],
                tags: ['核心成员','全栈工程师','AI爱好者'],
                preferences: { theme: 'light', language: 'zh-CN', notifications: true, compactMode: false },
                stats: { loginCount: 313, promptCount: 87, chatCount: 1024 },
            },
            {
                username: 'user', password: '123456', name: '李晓明', nickname: '小李',
                email: 'lixm@company.com',
                avatar_url: 'https://api.dicebear.com/9.x/avataaars/svg?seed=user&backgroundColor=ffdfbf',
                role: 'user', phone: '136****6688', gender: 'male',
                department: '产品部', position: '产品经理',
                bio: '专注于AI产品设计，热衷于探索新技术与用户体验',
                location: '北京', website: '', status: 'active',
                permissions: ['prompt:read','prompt:write','user:read'],
                tags: ['产品经理','AI探索者'],
                preferences: { theme: 'light', language: 'zh-CN', notifications: true, compactMode: true },
                stats: { loginCount: 51, promptCount: 12, chatCount: 89 },
            },
        ]
        for (const u of SEEDS) {
            const hash = await bcrypt.hash(u.password, 10)
            _insertUserSync(db, u.username, u.email, hash, u)
        }
        save(db)
        console.log('  ✓ 已播种用户 admin / user（密码 123456，已 bcrypt 哈希）')
    } else {
        save(db)
    }
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function createUser(username, email, passwordHash, extra = {}) {
    const db = load()
    const id = _insertUserSync(db, username, email, passwordHash, extra)
    save(db)
    return id
}

function _insertUserSync(db, username, email, passwordHash, extra = {}) {
    const id = nextId(db, 'users')
    const ts = now()
    db.users.push({
        id,
        username,
        email:         email            || null,
        password_hash: passwordHash,
        avatar_url:    extra.avatar_url || null,
        name:          extra.name       || username,
        nickname:      extra.nickname   || username,
        role:          extra.role       || 'user',
        phone:         extra.phone      || null,
        gender:        extra.gender     || null,
        department:    extra.department || null,
        position:      extra.position   || null,
        bio:           extra.bio        || null,
        location:      extra.location   || null,
        website:       extra.website    || null,
        status:        extra.status     || 'active',
        permissions:   extra.permissions || [],
        tags:          extra.tags        || [],
        preferences:   extra.preferences || {},
        stats:         extra.stats       || { loginCount: 0, promptCount: 0, chatCount: 0 },
        last_login_at: null,
        created_at:    ts,
        updated_at:    ts,
    })
    return id
}

async function getUserById(id) {
    const row = load().users.find(u => sameId(u.id, id))
    return row ? fmtUser(row) : null
}

async function getUserByUsername(username) {
    // 保留原始行（含 password_hash），与原实现一致
    return load().users.find(u => u.username === username) || null
}

async function getAllUsers() {
    return load().users.slice().sort((a, b) => a.id - b.id).map(fmtUser)
}

async function updateUserLogin(id) {
    const db  = load()
    const row = db.users.find(u => sameId(u.id, id))
    if (!row) return
    row.last_login_at = now()
    row.updated_at    = now()
    row.stats = { ...(row.stats || {}), loginCount: Number(row.stats?.loginCount || 0) + 1 }
    save(db)
}

function fmtUser(row) {
    return {
        id:          row.id,
        username:    row.username,
        email:       row.email,
        name:        row.name,
        nickname:    row.nickname,
        avatar:      row.avatar_url,
        phone:       row.phone,
        gender:      row.gender,
        role:        row.role,
        department:  row.department,
        position:    row.position,
        bio:         row.bio,
        location:    row.location,
        website:     row.website,
        status:      row.status,
        permissions: parseJ(row.permissions, []),
        tags:        parseJ(row.tags, []),
        preferences: parseJ(row.preferences, {}),
        stats:       parseJ(row.stats, {}),
        createdAt:   row.created_at,
        updatedAt:   row.updated_at,
        lastLoginAt: row.last_login_at,
    }
}

// ── Conversations ─────────────────────────────────────────────────────────────
async function createConversation(userId, title = '新对话') {
    const db = load()
    const id = nextId(db, 'conversations')
    const ts = now()
    const row = {
        id,
        user_id:       userId,
        title:         title || '新对话',
        model:         'google/gemma-3-4b',
        system_prompt: null,
        is_pinned:     false,
        is_archived:   false,
        created_at:    ts,
        updated_at:    ts,
    }
    db.conversations.push(row)
    save(db)
    return fmtConv(row, 0)
}

async function getUserConversations(userId, limit = 50) {
    const db = load()
    return db.conversations
        .filter(c => sameId(c.user_id, userId) && !c.is_archived)
        .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
        .slice(0, limit)
        .map(c => fmtConv(c, db.messages.filter(m => sameId(m.conversation_id, c.id)).length))
}

async function getConversation(id, userId) {
    const db  = load()
    const row = db.conversations.find(c => sameId(c.id, id) && sameId(c.user_id, userId))
    if (!row) return null
    const msgs = await getConversationMessages(id)
    return { ...fmtConv(row, msgs.length), messages: msgs }
}

async function updateConversationTitle(id, title, userId) {
    const db  = load()
    const row = db.conversations.find(c => sameId(c.id, id) && sameId(c.user_id, userId))
    if (!row) return false
    row.title      = title
    row.updated_at = now()
    save(db)
    return true
}

async function deleteConversation(id, userId) {
    const db  = load()
    const idx = db.conversations.findIndex(c => sameId(c.id, id) && sameId(c.user_id, userId))
    if (idx === -1) return false
    db.conversations.splice(idx, 1)
    // 复刻 FOREIGN KEY ... ON DELETE CASCADE
    db.messages = db.messages.filter(m => !sameId(m.conversation_id, id))
    save(db)
    return true
}

// ── Messages ──────────────────────────────────────────────────────────────────
async function addMessage(conversationId, role, content) {
    const db = load()
    const id = nextId(db, 'messages')
    db.messages.push({
        id,
        conversation_id: conversationId,
        role,
        content,
        tokens:     0,
        metadata:   null,
        created_at: now(),
    })
    const conv = db.conversations.find(c => sameId(c.id, conversationId))
    if (conv) conv.updated_at = now()
    save(db)
    return id
}

async function getConversationMessages(conversationId) {
    return load().messages
        .filter(m => sameId(m.conversation_id, conversationId))
        // 同毫秒写入时按 id 兜底，保证 user/assistant 的先后顺序稳定
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id)
        .map(fmtMsg)
}

// ── Formatters ────────────────────────────────────────────────────────────────
function parseJ(val, fallback) {
    if (val == null) return fallback
    if (typeof val === 'object') return val
    try { return JSON.parse(val) } catch { return fallback }
}

function fmtConv(row, messageCount = 0) {
    return {
        id:           String(row.id),
        title:        row.title,
        model:        row.model,
        systemPrompt: row.system_prompt,
        isPinned:     Boolean(row.is_pinned),
        isArchived:   Boolean(row.is_archived),
        messageCount: Number(messageCount),
        createdAt:    new Date(row.created_at).getTime(),
        updatedAt:    new Date(row.updated_at).getTime(),
    }
}

function fmtMsg(row) {
    return {
        id:        String(row.id),
        role:      row.role,
        content:   row.content,
        tokens:    row.tokens,
        metadata:  parseJ(row.metadata, null),
        createdAt: new Date(row.created_at).getTime(),
    }
}

// ── Feedback ──────────────────────────────────────────────────────────────────
async function upsertFeedback(messageId, userId, feedbackType, opts = {}) {
    const { reasonTags = null, comment = null, userQuery = null, aiResponse = null, conversationId = null } = opts
    const tagsStr = Array.isArray(reasonTags) ? reasonTags.join(',') : reasonTags

    const db = load()
    // 复刻 UNIQUE KEY uk_msg_user (message_id, user_id) + ON DUPLICATE KEY UPDATE
    const row = db.feedback.find(f => sameId(f.message_id, messageId) && sameId(f.user_id, userId))
    if (row) {
        row.feedback_type = feedbackType
        row.reason_tags   = tagsStr
        row.comment       = comment || null
        row.updated_at    = now()
    } else {
        const ts = now()
        db.feedback.push({
            id:              nextId(db, 'feedback'),
            message_id:      messageId,
            user_id:         userId,
            conversation_id: conversationId || null,
            feedback_type:   feedbackType,
            reason_tags:     tagsStr,
            comment:         comment    || null,
            user_query:      userQuery  || null,
            ai_response:     aiResponse || null,
            created_at:      ts,
            updated_at:      ts,
        })
    }
    save(db)
}

async function deleteFeedback(messageId, userId) {
    const db  = load()
    const idx = db.feedback.findIndex(f => sameId(f.message_id, messageId) && sameId(f.user_id, userId))
    if (idx === -1) return false
    db.feedback.splice(idx, 1)
    save(db)
    return true
}

async function getFeedbackStats(userId, conversationId = null) {
    let rows = load().feedback.filter(f => sameId(f.user_id, userId))
    if (conversationId) rows = rows.filter(f => sameId(f.conversation_id, conversationId))
    return {
        likes:    rows.filter(f => f.feedback_type === 1).length,
        dislikes: rows.filter(f => f.feedback_type === -1).length,
        total:    rows.length,
    }
}

async function getMessageFeedback(messageIds, userId) {
    if (!messageIds || messageIds.length === 0) return {}
    const ids  = messageIds.map(String)
    const rows = load().feedback.filter(
        f => ids.includes(String(f.message_id)) && sameId(f.user_id, userId)
    )
    const map = {}
    for (const r of rows) {
        map[r.message_id] = {
            feedbackType: r.feedback_type,
            reasonTags:   r.reason_tags ? r.reason_tags.split(',') : [],
            comment:      r.comment,
        }
    }
    return map
}

module.exports = {
    initDb,
    // users
    createUser, getUserById, getUserByUsername, getAllUsers, updateUserLogin,
    // conversations
    createConversation, getUserConversations, getConversation,
    updateConversationTitle, deleteConversation,
    // messages
    addMessage, getConversationMessages,
    // feedback
    upsertFeedback, deleteFeedback, getFeedbackStats, getMessageFeedback,
}
