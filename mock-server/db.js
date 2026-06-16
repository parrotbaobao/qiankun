require('dotenv').config()
const mysql  = require('mysql2/promise')
const bcrypt = require('bcryptjs')

const pool = mysql.createPool({
    host:               process.env.DB_HOST     || '192.168.31.203',
    port:               Number(process.env.DB_PORT) || 3306,
    user:               process.env.DB_USER     || 'remote_user',
    password:           process.env.DB_PASSWORD || 'Remote123!',
    database:           process.env.DB_NAME     || 'ai_chat',
    charset:            'utf8mb4',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    connectTimeout:     3000,
})

// ── 建表 & 播种 ───────────────────────────────────────────────────────────────
async function initDb() {
    await pool.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id            BIGINT       PRIMARY KEY AUTO_INCREMENT,
            username      VARCHAR(50)  UNIQUE NOT NULL,
            email         VARCHAR(100) UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            avatar_url    VARCHAR(500),
            name          VARCHAR(100),
            nickname      VARCHAR(50),
            role          ENUM('admin','user') DEFAULT 'user',
            phone         VARCHAR(20),
            gender        ENUM('male','female','other'),
            department    VARCHAR(100),
            position      VARCHAR(100),
            bio           TEXT,
            location      VARCHAR(100),
            website       VARCHAR(200),
            status        ENUM('active','inactive') DEFAULT 'active',
            permissions   JSON,
            tags          JSON,
            preferences   JSON,
            stats         JSON,
            last_login_at TIMESTAMP NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS conversations (
            id            BIGINT      PRIMARY KEY AUTO_INCREMENT,
            user_id       BIGINT      NOT NULL,
            title         VARCHAR(200) DEFAULT '新对话',
            model         VARCHAR(50)  DEFAULT 'google/gemma-3-4b',
            system_prompt TEXT,
            is_pinned     BOOLEAN     DEFAULT FALSE,
            is_archived   BOOLEAN     DEFAULT FALSE,
            created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS messages (
            id              BIGINT    PRIMARY KEY AUTO_INCREMENT,
            conversation_id BIGINT    NOT NULL,
            role            ENUM('user','assistant','system') NOT NULL,
            content         TEXT      NOT NULL,
            tokens          INT       DEFAULT 0,
            metadata        JSON,
            created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    await pool.execute(`
        CREATE TABLE IF NOT EXISTS conversation_feedback (
            id              BIGINT       PRIMARY KEY AUTO_INCREMENT,
            message_id      VARCHAR(64)  NOT NULL,
            user_id         BIGINT       NOT NULL,
            conversation_id BIGINT,
            feedback_type   TINYINT      NOT NULL DEFAULT 0,
            reason_tags     VARCHAR(500),
            comment         TEXT,
            user_query      TEXT,
            ai_response     TEXT,
            created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            updated_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY uk_msg_user (message_id, user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `)

    // 种子用户（仅首次，表为空时插入）
    const [[{ cnt }]] = await pool.execute('SELECT COUNT(*) AS cnt FROM users')
    if (Number(cnt) === 0) {
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
            await _insertUser(u.username, u.email, hash, u)
        }
        console.log('  ✓ 已播种用户 admin / user（密码 123456，已 bcrypt 哈希）')
    }
}

// ── Users ─────────────────────────────────────────────────────────────────────
async function createUser(username, email, passwordHash, extra = {}) {
    const id = await _insertUser(username, email, passwordHash, extra)
    return id
}

async function _insertUser(username, email, passwordHash, extra = {}) {
    const [r] = await pool.execute(
        `INSERT INTO users
         (username, email, password_hash, avatar_url, name, nickname, role, phone, gender,
          department, position, bio, location, website, status, permissions, tags, preferences, stats)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            username,
            email         || null,
            passwordHash,
            extra.avatar_url  || null,
            extra.name        || username,
            extra.nickname    || username,
            extra.role        || 'user',
            extra.phone       || null,
            extra.gender      || null,
            extra.department  || null,
            extra.position    || null,
            extra.bio         || null,
            extra.location    || null,
            extra.website     || null,
            extra.status      || 'active',
            JSON.stringify(extra.permissions || []),
            JSON.stringify(extra.tags        || []),
            JSON.stringify(extra.preferences || {}),
            JSON.stringify(extra.stats       || { loginCount: 0, promptCount: 0, chatCount: 0 }),
        ]
    )
    return r.insertId
}

async function getUserById(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id])
    return rows[0] ? fmtUser(rows[0]) : null
}

async function getUserByUsername(username) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username])
    return rows[0] || null   // 保留原始行（含 password_hash）
}

async function getAllUsers() {
    const [rows] = await pool.execute('SELECT * FROM users ORDER BY id')
    return rows.map(fmtUser)
}

async function updateUserLogin(id) {
    await pool.execute(
        `UPDATE users SET
            last_login_at = NOW(),
            stats = JSON_SET(COALESCE(stats, '{}'), '$.loginCount',
                COALESCE(JSON_EXTRACT(stats, '$.loginCount'), 0) + 1)
         WHERE id = ?`,
        [id]
    )
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
    const [r] = await pool.execute(
        'INSERT INTO conversations (user_id, title) VALUES (?, ?)',
        [userId, title]
    )
    const [rows] = await pool.execute('SELECT * FROM conversations WHERE id = ?', [r.insertId])
    return fmtConv(rows[0], 0)
}

async function getUserConversations(userId, limit = 50) {
    const [rows] = await pool.execute(
        `SELECT c.*, COUNT(m.id) AS message_count
         FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.user_id = ? AND c.is_archived = FALSE
         GROUP BY c.id
         ORDER BY c.updated_at DESC
         LIMIT ?`,
        [userId, limit]
    )
    return rows.map(r => fmtConv(r, Number(r.message_count)))
}

async function getConversation(id, userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM conversations WHERE id = ? AND user_id = ?',
        [id, userId]
    )
    if (!rows[0]) return null
    const msgs = await getConversationMessages(id)
    return { ...fmtConv(rows[0], msgs.length), messages: msgs }
}

async function updateConversationTitle(id, title, userId) {
    const [r] = await pool.execute(
        'UPDATE conversations SET title = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
        [title, id, userId]
    )
    return r.affectedRows > 0
}

async function deleteConversation(id, userId) {
    const [r] = await pool.execute(
        'DELETE FROM conversations WHERE id = ? AND user_id = ?',
        [id, userId]
    )
    return r.affectedRows > 0
}

// ── Messages ──────────────────────────────────────────────────────────────────
async function addMessage(conversationId, role, content) {
    const [r] = await pool.execute(
        'INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)',
        [conversationId, role, content]
    )
    await pool.execute(
        'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
        [conversationId]
    )
    return r.insertId
}

async function getConversationMessages(conversationId) {
    const [rows] = await pool.execute(
        'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
        [conversationId]
    )
    return rows.map(fmtMsg)
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
    await pool.execute(
        `INSERT INTO conversation_feedback
            (message_id, user_id, conversation_id, feedback_type, reason_tags, comment, user_query, ai_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            feedback_type = VALUES(feedback_type),
            reason_tags   = VALUES(reason_tags),
            comment       = VALUES(comment),
            updated_at    = NOW()`,
        [messageId, userId, conversationId || null, feedbackType, tagsStr, comment || null, userQuery || null, aiResponse || null]
    )
}

async function deleteFeedback(messageId, userId) {
    const [r] = await pool.execute(
        'DELETE FROM conversation_feedback WHERE message_id = ? AND user_id = ?',
        [messageId, userId]
    )
    return r.affectedRows > 0
}

async function getFeedbackStats(userId, conversationId = null) {
    let sql = `SELECT
        SUM(feedback_type = 1) AS likes,
        SUM(feedback_type = -1) AS dislikes,
        COUNT(*) AS total
        FROM conversation_feedback WHERE user_id = ?`
    const params = [userId]
    if (conversationId) {
        sql += ' AND conversation_id = ?'
        params.push(conversationId)
    }
    const [[row]] = await pool.execute(sql, params)
    return {
        likes:    Number(row.likes    || 0),
        dislikes: Number(row.dislikes || 0),
        total:    Number(row.total    || 0),
    }
}

async function getMessageFeedback(messageIds, userId) {
    if (!messageIds || messageIds.length === 0) return {}
    const placeholders = messageIds.map(() => '?').join(',')
    const [rows] = await pool.execute(
        `SELECT message_id, feedback_type, reason_tags, comment
         FROM conversation_feedback
         WHERE message_id IN (${placeholders}) AND user_id = ?`,
        [...messageIds, userId]
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
    pool, initDb,
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
