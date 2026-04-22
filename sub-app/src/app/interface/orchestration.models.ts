export enum NodeType {
  START = 'start',
  END = 'end',
  API = 'api',
  CONDITION = 'condition',
  PLACEHOLDER = 'placeholder',
  CONNECTOR = 'connector'
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE'
}

export enum Operator {
  EQ = '==',
  NEQ = '!=',
  GT = '>',
  LT = '<',
  GTE = '>=',
  LTE = '<=',
  INCLUDES = 'includes'
}

export type BranchType = 'true' | 'false';

export interface NodeBase {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  templateHtml?: string;
  parentNodeId?: string;
  branchType?: BranchType;
  slotType?: 'in' | 'out' | 'merge';
}

export interface StartNodeConfig {
  icon?: string;
}

export interface EndNodeConfig {
  icon?: string;
}

export interface ApiNodeConfig {
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  params: Record<string, string>;
  body: any;
  mockResponse: any;
  templateKey?: string;
}

export interface ConditionNodeConfig {
  sourceNodeId: string;
  fieldPath: string;
  operator: Operator;
  compareValue: any;
  trueBranch?: string;
  falseBranch?: string;
}

export interface StartNode extends NodeBase {
  type: NodeType.START;
  config: StartNodeConfig;
}

export interface EndNode extends NodeBase {
  type: NodeType.END;
  config: EndNodeConfig;
}

export interface ApiNode extends NodeBase {
  type: NodeType.API;
  config: ApiNodeConfig;
}

export interface ConditionNode extends NodeBase {
  type: NodeType.CONDITION;
  config: ConditionNodeConfig;
}

export interface PlaceholderNode extends NodeBase {
  type: NodeType.PLACEHOLDER;
  config?: Record<string, any>;
}

export interface ConnectorNode extends NodeBase {
  type: NodeType.CONNECTOR;
  config?: Record<string, any>;
}

export type WorkflowNode =
  | StartNode
  | EndNode
  | ApiNode
  | ConditionNode
  | PlaceholderNode
  | ConnectorNode;

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface NodeDropPayload {
  type: NodeType;
  x: number;
  y: number;
  label?: string;
  method?: HttpMethod;
  templateKey?: string;
  prevNodeId?: string;
  nextNodeId?: string;
  branchType?: BranchType;
}