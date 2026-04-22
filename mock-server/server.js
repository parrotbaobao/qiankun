const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DB_PATH = path.join(__dirname, 'workflow-db.json');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

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

app.listen(PORT, () => {
    console.log(`mock server running at http://localhost:${PORT}`);
});