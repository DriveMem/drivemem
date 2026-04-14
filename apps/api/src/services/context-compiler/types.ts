export interface CompileContextRequest {
  task: string;
  model?: { name?: string; contextWindow?: number };
  tokenBudget?: number; // default 8000
  hints?: {
    project?: string;
    tags?: string[];
    recency?: string; // e.g. "7d", "30d"
    folderId?: string;
  };
  format?: 'markdown'; // v1 only markdown
}

export interface CompileContextResponse {
  compiledContext: string;
  metadata: CompilationMetadata;
}

export interface CompilationMetadata {
  fragmentCount: number;
  totalTokens: number;
  tokenBudget: number;
  compilationTimeMs: number;
  coverage: 'full' | 'partial' | 'insufficient';
  sources: SourceInfo[];
}

export interface SourceInfo {
  fileId: string;
  fileName: string;
  relevanceScore: number;
  tokensUsed: number;
}

export interface KnowledgeFragment {
  id: string;
  fileId: string;
  fileName: string;
  text: string;
  relevanceScore: number;
  chunkIndex: number;
}

export interface AgentProfile {
  id: string;
  name: string;
  contextWindow: number;
  preferredFormat: 'markdown';
  maxFragments: number;
  priorityRules: string[]; // e.g. ["recency", "relevance"]
}
