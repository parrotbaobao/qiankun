import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { WorkflowNode, NodeType, HttpMethod, Workflow, Operator } from '../../interface/orchestration.models';
import { OrchestrationService } from 'src/app/services/orchestration.service';

@Component({
  selector: 'app-node-config-panel',
  templateUrl: './node-config-panel.component.html',
  styleUrls: ['./node-config-panel.component.css']
})
export class NodeConfigPanelComponent implements OnInit {
  @Input() selectedNode: WorkflowNode | null = null;
  @Input() workflow: Workflow = { id: '', name: '', nodes: [], edges: [] };
  @Output() nodeUpdated = new EventEmitter<WorkflowNode>();

  nodeForm: FormGroup = this.fb.group({});
  httpMethods = Object.values(HttpMethod);
  operators = Object.values(Operator);
  upstreamApiNodes: WorkflowNode[] = [];

  constructor(private fb: FormBuilder, private orchestrationService: OrchestrationService) { }

  ngOnInit(): void { }

  ngOnChanges(): void {
    if (this.selectedNode) {
      this.buildForm();
      this.findUpstreamApiNodes();
    }
  }

  private buildForm(): void {
    if (!this.selectedNode) return;

    if (this.selectedNode.type === NodeType.API) {
      this.nodeForm = this.fb.group({
        name: [this.selectedNode.name],
        method: [this.selectedNode.config.method],
        url: [this.selectedNode.config.url],
        headers: this.fb.array(this.getFormArray(this.selectedNode.config.headers)),
        params: this.fb.array(this.getFormArray(this.selectedNode.config.params)),
        body: [JSON.stringify(this.selectedNode.config.body, null, 2)],
        mockResponse: [JSON.stringify(this.selectedNode.config.mockResponse, null, 2)]
      });
    } else if (this.selectedNode.type === NodeType.CONDITION) {
      this.nodeForm = this.fb.group({
        name: [this.selectedNode.name],
        sourceNodeId: [this.selectedNode.config.sourceNodeId],
        fieldPath: [this.selectedNode.config.fieldPath],
        operator: [this.selectedNode.config.operator],
        compareValue: [this.selectedNode.config.compareValue]
      });
    }

    // 监听表单变化
    this.nodeForm.valueChanges.subscribe(() => {
      this.updateNode();
    });
  }

  private getFormArray(obj: Record<string, string>): any[] {
    return Object.entries(obj).map(([key, value]) => {
      return this.fb.group({
        key: [key],
        value: [value]
      });
    });
  }

  private updateNode(): void {
    if (!this.selectedNode) return;

    const updatedNode = { ...this.selectedNode };
    updatedNode.name = this.nodeForm.get('name')?.value;

    if (updatedNode.type === NodeType.API) {
      updatedNode.config = {
        ...updatedNode.config,
        method: this.nodeForm.get('method')?.value,
        url: this.nodeForm.get('url')?.value,
        headers: this.getObjectFromFormArray(this.nodeForm.get('headers') as FormArray),
        params: this.getObjectFromFormArray(this.nodeForm.get('params') as FormArray),
        body: this.parseJson(this.nodeForm.get('body')?.value),
        mockResponse: this.parseJson(this.nodeForm.get('mockResponse')?.value)
      };
    } else if (updatedNode.type === NodeType.CONDITION) {
      updatedNode.config = {
        ...updatedNode.config,
        sourceNodeId: this.nodeForm.get('sourceNodeId')?.value,
        fieldPath: this.nodeForm.get('fieldPath')?.value,
        operator: this.nodeForm.get('operator')?.value,
        compareValue: this.nodeForm.get('compareValue')?.value
      };
    }

    this.nodeUpdated.emit(updatedNode);
  }

  private getObjectFromFormArray(formArray: FormArray): Record<string, string> {
    return formArray.controls.reduce((acc: Record<string, string>, control: any) => {
      acc[control.value.key] = control.value.value;
      return acc;
    }, {});
  }

  private parseJson(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  private findUpstreamApiNodes(): void {
    if (!this.selectedNode) return;
    this.upstreamApiNodes = this.orchestrationService.findUpstreamApiNodes(this.selectedNode.id, this.workflow);
  }

  getHeaders(): FormArray {
    return this.nodeForm.get('headers') as FormArray;
  }

  getParams(): FormArray {
    return this.nodeForm.get('params') as FormArray;
  }

  addHeader(): void {
    this.getHeaders().push(this.fb.group({ key: [''], value: [''] }));
  }

  removeHeader(index: number): void {
    this.getHeaders().removeAt(index);
  }

  addParam(): void {
    this.getParams().push(this.fb.group({ key: [''], value: [''] }));
  }

  removeParam(index: number): void {
    this.getParams().removeAt(index);
  }
}