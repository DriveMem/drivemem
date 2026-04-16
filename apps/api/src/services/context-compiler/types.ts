export interface CompileContextRequest {
  task: string;
  model?: { name?: string; contextWindow?: number };
  tokenBudget?: number; // default 8000
  role?: string; // agent role for content routing
  since?: string; // ISO timestamp for incremental diff
  hints?: {
    project?: string;
    tags?: string[];
    recency?: string; // e.g. "7d", "30d"
    folderId?: string;
  };
  format?: 'markdown'; // v1 only markdown
  depth?: 'L1' | 'L2' | 'L3' | 'L4';
}

export interface CompileContextResponse {
  compiledContext: string;
  metadata: CompilationMetadata;
  diff?: {
    added: KnowledgeFragment[];
    updated: KnowledgeFragment[];
    removed: string[];
  };
}

export interface CompilationSnapshot {
  fragments: KnowledgeFragment[];
  fragmentIds: Set<string>;
  timestamp: string;
  compiledAt: number;
}

export interface CompilationMetadata {
  fragmentCount: number;
  totalTokens: number;
  tokenBudget: number;
  compilationTimeMs: number;
  coverage: 'full' | 'partial' | 'insufficient';
  sources: SourceInfo[];
  graphExpanded?: number;
  depth?: string;
  availableLayers?: string[];
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

export const DEPTH_LEVELS = ['L1', 'L2', 'L3', 'L4'] as const;
export type DepthLevel = (typeof DEPTH_LEVELS)[number];

export const LAYER_BUDGETS: Record<DepthLevel, number> = {
  L1: 500,
  L2: 2000,
  L3: 5000,
  L4: 8000,
};

export interface AgentProfile {
  id: string;
  name: string;
  contextWindow: number;
  preferredFormat: 'markdown';
  maxFragments: number;
  priorityRules: string[]; // e.g. ["recency", "relevance"]
  role?: string; // 'coder' | 'writer' | 'researcher' | 'strategist' | 'general'
}
