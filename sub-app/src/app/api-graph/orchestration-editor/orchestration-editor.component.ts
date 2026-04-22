import { Component, OnInit } from '@angular/core';
import { WorkflowApiService } from '../../services/api.service';
import {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  NodeDropPayload,
  NodeType
} from '../../interface/orchestration.models';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-orchestration-editor',
  templateUrl: './orchestration-editor.component.html',
  styleUrls: ['./orchestration-editor.component.css']
})
export class OrchestrationEditorComponent implements OnInit {
  workflow: Workflow = {
    id: 'workflow_1',
    name: '测试编排',
    nodes: [],
    edges: []
  };

  selectedNode: WorkflowNode | null = null;
  loading = false;
  graph: any = null;

  constructor(private workflowApiService: WorkflowApiService) { }

  ngOnInit(): void {
    this.loadWorkflow();
  }

  onGraphReady(graph: any): void {
    this.graph = graph;
  }

  onNodeSelected(node: WorkflowNode): void {
    this.selectedNode = node;
  }

  onNodeDropRequested(payload: NodeDropPayload): void {
    this.loading = true;
    this.workflowApiService.addNode(this.workflow.id, payload).pipe(switchMap((res) => this.workflowApiService.getWorkflow(this.workflow.id))).subscribe({
      next: (res) => {
        this.loading = false;
        const workflow = res.data || {
          id: 'workflow_1',
          name: '测试编排',
          nodes: [],
          edges: []
        };
        this.workflow = this.layoutWorkflow(workflow);
      },
      error: (err) => {
        this.loading = false;
        console.error('新增节点失败:', err);
        alert('新增节点失败');
      }
    });
  }

  onEdgeCreated(edge: WorkflowEdge): void {
    const exists = this.workflow.edges.some(item => item.id === edge.id);
    if (exists) return;

    this.workflow = {
      ...this.workflow,
      edges: [...this.workflow.edges, edge]
    };
  }

  saveWorkflow(): void {
    this.loading = true;

    this.workflowApiService.saveWorkflow(this.workflow).subscribe({
      next: () => {
        this.loading = false;
        alert('保存成功');
      },
      error: (err) => {
        this.loading = false;
        console.error('保存失败:', err);
        alert('保存失败');
      }
    });
  }

  loadWorkflow(): void {
    this.loading = true;

    this.workflowApiService.getWorkflow(this.workflow.id).subscribe({
      next: (res) => {
        this.loading = false;
        const workflow = res.data || {
          id: 'workflow_1',
          name: '测试编排',
          nodes: [],
          edges: []
        };

        this.workflow = this.layoutWorkflow(workflow);
      },
      error: () => {
        this.loading = false;
        this.workflow = {
          id: 'workflow_1',
          name: '测试编排',
          nodes: [],
          edges: []
        };
      }
    });
  }

  resetWorkflow(): void {
    const emptyWorkflow: Workflow = {
      id: this.workflow.id,
      name: this.workflow.name || '测试编排',
      nodes: [],
      edges: []
    };

    this.selectedNode = null;
    this.workflow = emptyWorkflow;
    this.loading = true;

    this.workflowApiService.saveWorkflow(emptyWorkflow).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('清空失败:', err);
        alert('清空失败');
      }
    });
  }

  private layoutWorkflow(workflow: Workflow): Workflow {
    const nodes = workflow.nodes.map(node => ({ ...node }));
    const edges = [...workflow.edges];

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const incomingCount = new Map<string, number>();

    nodes.forEach(node => incomingCount.set(node.id, 0));
    edges.forEach(edge => {
      incomingCount.set(edge.target, (incomingCount.get(edge.target) || 0) + 1);
    });

    const roots = nodes.filter(node => (incomingCount.get(node.id) || 0) === 0);
    const visited = new Set<string>();

    const startX = 320;
    const startY = 60;
    const levelGapY = 120;
    const branchGapX = 260;

    const layoutNode = (nodeId: string, x: number, y: number) => {
      if (visited.has(nodeId)) return;
      const node = nodeMap.get(nodeId);
      if (!node) return;

      visited.add(nodeId);

      if (node.type === NodeType.CONDITION) {
        node.width = 48;
        node.height = 48;
      } else if (node.type === NodeType.PLACEHOLDER) {
        node.width = 180;
        node.height = 72;
      } else if (node.type === NodeType.CONNECTOR) {
        node.width = 12;
        node.height = 12;
      } else {
        node.width = 160;
        node.height = 64;
      }

      node.x = x;
      node.y = y;

      const nextEdges = edges.filter(edge => edge.source === nodeId);
      const nextIds = nextEdges.map(edge => edge.target);

      if (node.type === NodeType.CONDITION) {
        const trueId = (node as any).config?.trueBranch;
        const falseId = (node as any).config?.falseBranch;

        if (trueId) {
          layoutNode(trueId, x - branchGapX / 2, y + levelGapY);
        }

        if (falseId) {
          layoutNode(falseId, x + branchGapX / 2, y + levelGapY);
        }

        return;
      }

      if (nextIds.length === 1) {
        const nextNode = nodeMap.get(nextIds[0]);
        if (!nextNode) return;

        layoutNode(
          nextNode.id,
          x + node.width / 2 - nextNode.width / 2,
          y + node.height + levelGapY / 2
        );
      }
    };

    roots.forEach((root, index) => {
      layoutNode(root.id, startX + index * 240, startY);
    });

    return {
      ...workflow,
      nodes: Array.from(nodeMap.values())
    };
  }
}