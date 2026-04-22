import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import {
  NodeType,
  NodeDropPayload,
  HttpMethod,
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  BranchType
} from '../../interface/orchestration.models';

declare global {
  interface Window {
    mxUtils: any;
  }
}

interface PaletteItem {
  type: NodeType;
  label: string;
  method?: HttpMethod;
  templateKey?: string;
}

@Component({
  selector: 'app-node-palette',
  templateUrl: './node-palette.component.html',
  styleUrls: ['./node-palette.component.css']
})
export class NodePaletteComponent implements AfterViewInit, OnChanges {
  @Input() graph: any;
  @Input() workflow: Workflow = {
    id: 'workflow_1',
    name: '测试编排',
    nodes: [],
    edges: []
  };

  @Output() nodeDropRequested = new EventEmitter<NodeDropPayload>();

  @ViewChildren('paletteItem')
  paletteItemRefs!: QueryList<ElementRef<HTMLDivElement>>;

  private viewInited = false;
  private paletteInited = false;

  public paletteItems: PaletteItem[] = [
    {
      type: NodeType.API,
      label: '查询用户 API',
      method: HttpMethod.GET,
      templateKey: 'user-query'
    },
    {
      type: NodeType.API,
      label: '创建订单 API',
      method: HttpMethod.POST,
      templateKey: 'order-create'
    },
    {
      type: NodeType.API,
      label: '更新用户 API',
      method: HttpMethod.PUT,
      templateKey: 'user-update'
    },
    {
      type: NodeType.CONDITION,
      label: '条件分支'
    }
  ];

  ngAfterViewInit(): void {
    this.viewInited = true;
    this.initPalette();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['graph']) {
      this.paletteInited = false;
      this.initPalette();
    }
  }

  private initPalette(): void {
    if (!this.viewInited || !this.graph || this.paletteInited) return;

    const mxUtils = window.mxUtils;
    if (!mxUtils) {
      console.error('mxUtils 未加载');
      return;
    }

    if (!this.paletteItemRefs || !this.paletteItemRefs.length) return;

    this.paletteItemRefs.forEach((ref, index) => {
      const item = this.paletteItems[index];
      if (item) {
        this.makePaletteItemDraggable(ref.nativeElement, item);
      }
    });

    this.paletteInited = true;
  }

  private makePaletteItemDraggable(sourceEl: HTMLElement, item: PaletteItem): void {
    const mxUtils = window.mxUtils;

    const dragSource = mxUtils.makeDraggable(
      sourceEl,
      this.graph,
      (graph: any, evt: MouseEvent, cell: any, x: number, y: number) => {
        const dropX = x - 80;
        const dropY = y - 32;
        const relation = this.resolveInsertRelation(dropX, dropY);

        this.nodeDropRequested.emit({
          type: item.type,
          x: dropX,
          y: dropY,
          label: item.label,
          method: item.method,
          templateKey: item.templateKey,
          prevNodeId: relation.prevNodeId,
          nextNodeId: relation.nextNodeId,
          branchType: relation.branchType
        });
      }
    );

    dragSource.createDragElement = function () {
      return sourceEl.cloneNode(true) as HTMLElement;
    };

    const oldStartDrag = dragSource.startDrag;
    dragSource.startDrag = function () {
      sourceEl.style.opacity = '0.2';
      oldStartDrag.apply(this, arguments as any);
    };

    const oldStopDrag = dragSource.stopDrag;
    dragSource.stopDrag = function () {
      sourceEl.style.opacity = '';
      oldStopDrag.apply(this, arguments as any);
    };

    dragSource.autoscroll = true;
    dragSource.guidesEnabled = true;
  }

  private resolveInsertRelation(x: number, y: number): {
    prevNodeId?: string;
    nextNodeId?: string;
    branchType?: BranchType;
  } {
    const nearestEdge = this.findNearestEdge(x, y);

    if (nearestEdge) {
      const prevNode = this.getNodeById(nearestEdge.source);
      const nextNode = this.getNodeById(nearestEdge.target);

      return {
        prevNodeId: nearestEdge.source,
        nextNodeId: nearestEdge.target,
        branchType: this.getBranchType(prevNode, nextNode)
      };
    }

    const hitNode = this.findNodeAtPoint(x, y);
    if (hitNode) {
      if (hitNode.type === NodeType.CONDITION) {
        const centerX = hitNode.x + hitNode.width / 2;
        const branchType: BranchType = x <= centerX ? 'true' : 'false';
        const nextNodeId =
          branchType === 'true'
            ? hitNode.config.trueBranch
            : hitNode.config.falseBranch;

        return {
          prevNodeId: hitNode.id,
          nextNodeId: nextNodeId || undefined,
          branchType
        };
      }

      const outgoingEdges = this.workflow.edges.filter(edge => edge.source === hitNode.id);

      if (outgoingEdges.length === 1) {
        return {
          prevNodeId: hitNode.id,
          nextNodeId: outgoingEdges[0].target
        };
      }

      return {
        prevNodeId: hitNode.id
      };
    }

    const lastNode = this.workflow.nodes[this.workflow.nodes.length - 1];
    if (lastNode) {
      return {
        prevNodeId: lastNode.id
      };
    }

    return {};
  }

  private getNodeById(id: string): WorkflowNode | undefined {
    return this.workflow.nodes.find(node => node.id === id);
  }

  private getBranchType(
    prevNode?: WorkflowNode,
    nextNode?: WorkflowNode
  ): BranchType | undefined {
    if (!prevNode || !nextNode) return undefined;
    if (prevNode.type !== NodeType.CONDITION) return undefined;

    if (prevNode.config.trueBranch === nextNode.id) return 'true';
    if (prevNode.config.falseBranch === nextNode.id) return 'false';

    return undefined;
  }

  private findNodeAtPoint(x: number, y: number): WorkflowNode | undefined {
    return this.workflow.nodes.find(node => {
      const padding = 16;
      return (
        x >= node.x - padding &&
        x <= node.x + node.width + padding &&
        y >= node.y - padding &&
        y <= node.y + node.height + padding
      );
    });
  }

  private findNearestEdge(x: number, y: number): WorkflowEdge | undefined {
    let bestEdge: WorkflowEdge | undefined;
    let minDistance = Infinity;

    this.workflow.edges.forEach(edge => {
      const source = this.getNodeById(edge.source);
      const target = this.getNodeById(edge.target);
      if (!source || !target) return;

      const s = this.getNodeCenter(source);
      const t = this.getNodeCenter(target);
      const distance = this.distancePointToSegment(x, y, s.x, s.y, t.x, t.y);

      if (distance < minDistance) {
        minDistance = distance;
        bestEdge = edge;
      }
    });

    return minDistance <= 28 ? bestEdge : undefined;
  }

  private getNodeCenter(node: WorkflowNode): { x: number; y: number } {
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2
    };
  }

  private distancePointToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;

    if (dx === 0 && dy === 0) {
      return Math.hypot(px - x1, py - y1);
    }

    const t = Math.max(
      0,
      Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy))
    );

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.hypot(px - projX, py - projY);
  }
}