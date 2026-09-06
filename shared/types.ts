export interface QuestionRequest {
  question: string;
  sessionId?: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

export interface VisualizationStep {
  step: number;
  description: string;
  action: 'compare' | 'swap' | 'highlight' | 'insert' | 'delete';
  indices?: number[];
  values?: (number | string)[];
}

export interface QuestionResponse {
  sessionId: string;
  question: string;
  answer: string;
  audioUrl?: string;
  phonemeTimings?: Array<{
    phoneme: string;
    start: number;
    end: number;
  }>;
  code?: {
    language: string;
    snippet: string;
  };
  visualSequence?: {
    type: 'algorithm_visualization' | 'data_structure' | 'graph_traversal';
    topic: string;
    steps: VisualizationStep[];
  };
}
