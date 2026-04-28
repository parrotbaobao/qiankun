import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
  ViewEncapsulation,
  ViewChildren,
  QueryList,
  NgZone
} from '@angular/core';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  NodeType,
  HttpMethod
} from '../../../shared/models/orchestration.models';
import { take } from 'rxjs';

declare global {
  interface Window {
    mxGraph: any;
    mxClient: any;
    mxUtils: any;
    mxEvent: any;
    mxRubberband: any;
  }
}

@Component({
  selector: 'app-graph-canvas',
  templateUrl: './graph-canvas.component.html',
  styleUrls: ['./graph-canvas.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GraphCanvasComponent implements AfterViewInit, OnChanges {
  @ViewChildren('flowNodeTpl')
  flowNodeTplRefs!: QueryList<ElementRef<HTMLElement>>;

  @Input() workflow: Workflow = {
    id: 'workflow_1',
    name: '测试编排',
    nodes: [],
    edges: []
  };

  NodeType = NodeType;

  @Output() graphReady = new EventEmitter<any>();
  @Output() nodeSelected = new EventEmitter<WorkflowNode>();
  @Output() edgeCreated = new EventEmitter<WorkflowEdge>();

  @ViewChild('graphContainer', { static: false })
  graphContainer!: ElementRef<HTMLDivElement>;

  private graph: any;
  private container!: HTMLDivElement;
  private inRender = false;

  constructor(private ngZone: NgZone) { }

  ngAfterViewInit(): void {
    this.initGraph();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['workflow'] && this.graph && !this.inRender) {
      this.ngZone.onStable.pipe(take(1)).subscribe(() => {
        if (!this.inRender) {
          this.renderWorkflow();
        }
      });
    }
  }

  getNodeMethod(node: WorkflowNode): string {
    return node.type === NodeType.API ? node.config.method : '';
  }

  getNodeSubText(node: WorkflowNode): string {
    if (node.type === NodeType.API) {
      return node.config.templateKey || node.config.url || '';
    }

    if (node.type === NodeType.PLACEHOLDER) {
      return node.name || '拖动或点击来添加连接器';
    }

    return '';
  }

  private initGraph(): void {
    const mxClient = window.mxClient;
    const mxGraph = window.mxGraph;
    const mxUtils = window.mxUtils;
    const mxEvent = window.mxEvent;
    const mxRubberband = window.mxRubberband;

    this.container = this.graphContainer?.nativeElement;

    if (!this.container) {
      console.error('graphContainer 未获取到');
      return;
    }

    if (!mxClient || !mxGraph || !mxUtils || !mxEvent || !mxRubberband) {
      console.error('mxGraph 相关对象未加载');
      return;
    }

    if (!mxClient.isBrowserSupported()) {
      mxUtils.error('Browser is not supported!', 200, false);
      return;
    }

    this.graph = new mxGraph(this.container);
    this.graph.setConnectable(true);
    this.graph.setMultigraph(false);
    this.graph.setAllowDanglingEdges(false);
    this.graph.setCellsEditable(false);
    this.graph.setCellsMovable(false);
    this.graph.setPanning(true);
    this.graph.setTooltips(true);
    this.graph.setHtmlLabels(true);

    this.graph.convertValueToString = (cell: any) => {
      const value = cell?.value;

      if (value instanceof HTMLElement) {
        return value.outerHTML;
      }

      if (typeof value === 'string') {
        return value;
      }

      return '';
    };

    new mxRubberband(this.graph);

    this.bindGraphEvents(mxEvent);
    this.renderWorkflow();

    setTimeout(() => {
      this.graphReady.emit(this.graph);
    });
  }

  private bindGraphEvents(mxEvent: any): void {
    this.graph.addListener(mxEvent.CLICK, () => {
      const cell = this.graph.getSelectionCell();
      if (cell && cell.vertex) {
        const node = this.workflow.nodes.find(n => n.id === cell.id);
        if (node) {
          this.nodeSelected.emit(node);
        }
      }
    });

    this.graph.addListener(mxEvent.CONNECT, (sender: any, event: any) => {
      const edge = event.getProperty('edge');
      const source = edge?.source;
      const target = edge?.target;

      if (!source?.id || !target?.id) return;

      edge.style =
        'edgeStyle=orthogonalEdgeStyle;' +
        'rounded=0;' +
        'orthogonalLoop=1;' +
        'jettySize=auto;' +
        'html=1;' +
        'strokeColor=#d9d9d9;' +
        'strokeWidth=2;' +
        'exitX=0.5;exitY=1;exitPerimeter=1;' +
        'entryX=0.5;entryY=0;entryPerimeter=1;';

      const newEdge: WorkflowEdge = {
        id: edge.id || `edge_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        source: source.id,
        target: target.id
      };

      edge.id = newEdge.id;
      this.edgeCreated.emit(newEdge);
    });
  }

  private renderWorkflow(): void {
    if (!this.graph) return;

    const parent = this.graph.getDefaultParent();
    this.inRender = true;
    this.graph.getModel().beginUpdate();

    try {
      this.graph.removeCells(this.graph.getChildCells(parent, true, true));

      const cellMap: Record<string, any> = {};

      this.workflow.nodes.forEach(node => {
        const renderedDom = this.getRenderedNodeDom(node.id);
        const value = renderedDom ? (renderedDom.cloneNode(true) as HTMLElement) : node.name;

        const cell = this.graph.insertVertex(
          parent,
          node.id,
          value,
          node.x,
          node.y,
          node.width,
          node.height,
          this.getNodeStyle(node.type)
        );

        cellMap[node.id] = cell;
      });

      const edgeStyle =
        'edgeStyle=orthogonalEdgeStyle;' +
        'rounded=0;' +
        'orthogonalLoop=1;' +
        'jettySize=auto;' +
        'html=1;' +
        'strokeColor=#d9d9d9;' +
        'strokeWidth=2;' +
        'exitX=0.5;exitY=1;exitPerimeter=1;' +
        'entryX=0.5;entryY=0;entryPerimeter=1;';

      this.workflow.edges.forEach(edge => {
        if (cellMap[edge.source] && cellMap[edge.target]) {
          this.graph.insertEdge(
            parent,
            edge.id,
            '',
            cellMap[edge.source],
            cellMap[edge.target],
            edgeStyle
          );
        }
      });
    } finally {
      this.graph.getModel().endUpdate();
      this.inRender = false;
    }
  }

  private getRenderedNodeDom(nodeId: string): HTMLElement | null {
    if (!this.flowNodeTplRefs || !this.flowNodeTplRefs.length) {
      return null;
    }

    const ref = this.flowNodeTplRefs.find(item => {
      return item.nativeElement.dataset['nodeId'] === nodeId;
    });

    return ref ? ref.nativeElement : null;
  }

  private getNodeStyle(nodeType: NodeType): string {
    return 'shape=label;html=1;whiteSpace=wrap;overflow=fill;strokeColor=none;fillColor=none;';
  }
}