import { Injectable } from '@angular/core';
import { Workflow, WorkflowNode, NodeType, HttpMethod, Operator } from '../interface/orchestration.models';
import { parsePath } from '../utils/path-parser';

@Injectable({
  providedIn: 'root'
})
export class OrchestrationService {
  createNode(type: NodeType, x: number, y: number, width: number, height: number): WorkflowNode {
    const id = `node_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    if (type === NodeType.API) {
      return {
        id,
        type: NodeType.API,
        name: 'API Node',
        x,
        y,
        width,
        height,
        config: {
          method: HttpMethod.GET,
          url: '',
          headers: {},
          params: {},
          body: {},
          mockResponse: {}
        }
      };
    } else {
      return {
        id,
        type: NodeType.CONDITION,
        name: 'Condition Node',
        x,
        y,
        width,
        height,
        config: {
          sourceNodeId: '',
          fieldPath: '',
          operator: Operator.EQ,
          compareValue: ''
        }
      };
    }
  }

  exportWorkflow(workflow: Workflow): string {
    return JSON.stringify(workflow, null, 2);
  }

  importWorkflow(json: string): Workflow {
    return JSON.parse(json);
  }

  findUpstreamApiNodes(nodeId: string, workflow: Workflow): WorkflowNode[] {
    const upstreamNodes = new Set<string>();
    const visited = new Set<string>();

    // 递归查找上游节点
    const findUpstream = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      workflow.edges.forEach(edge => {
        if (edge.target === currentId) {
          upstreamNodes.add(edge.source);
          findUpstream(edge.source);
        }
      });
    };

    findUpstream(nodeId);

    // 过滤出 API 节点
    return workflow.nodes.filter(node =>
      upstreamNodes.has(node.id) && node.type === NodeType.API
    );
  }

  getNodeValue(node: WorkflowNode, fieldPath: string): any {
    if (node.type === NodeType.API) {
      try {
        return parsePath(node.config?.mockResponse, fieldPath);
      } catch (e) {
        console.error('Error parsing field path:', e);
        return undefined;
      }
    }
    return undefined;
  }
}