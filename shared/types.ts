export type Sentiment = 'explaining' | 'thinking' | 'encouraging' | 'celebrating' | 'idle';

export interface QuestionRequest {
  question: string;
  sessionId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface TreeNode {
  id: number | string;
  val: number;
  left?: number | string | null;
  right?: number | string | null;
  status?: 'normal' | 'highlight' | 'active' | 'visited' | 'deleted';
  x?: number;
  y?: number;
}

export interface TreeData {
  rootId: number | string;
  nodes: TreeNode[];
}

export interface GraphNode {
  id: string;
  label: string;
  x?: number;
  y?: number;
  status?: 'normal' | 'highlight' | 'visited' | 'active';
}

export interface GraphEdge {
  from: string;
  to: string;
  weight?: number;
  status?: 'normal' | 'active' | 'visited';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface VisualizationStep {
  step: number;
  description: string;
  action: 'compare' | 'swap' | 'highlight' | 'traverse' | 'insert' | 'delete' | 'visit' | 'relax';
  indices?: number[];
  values?: (number | string)[];
  nodes?: (number | string)[];
  edges?: Array<{ from: string; to: string }>;
  activeLines?: number[];
}

export interface QuestionResponse {
  sessionId?: string;
  question?: string;
  answer: string;
  explanation?: string;
  mood?: Sentiment;
  audioUrl?: string;
  phonemeTimings?: Array<{
    phoneme: string;
    start: number;
    end: number;
  }>;
  code?: {
    language: 'python' | 'javascript' | 'java' | 'cpp';
    snippet: string;
    activeLines?: number[];
  };
  visualSequence?: {
    type: 'tree' | 'graph' | 'sorting' | 'array' | 'dp' | 'algorithm_visualization';
    title: string;
    treeData?: TreeData;
    graphData?: GraphData;
    steps: VisualizationStep[];
  };
  suggestedFollowUps?: string[];
}
