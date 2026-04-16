import type { KnowledgeFragment } from './types.js';

// --- Domain field definitions ---

interface FieldDef {
  name: string;
  description: string;
  keywords: string[];
}

interface DomainDef {
  fields: FieldDef[];
}

const DOMAIN_DEFS: Record<string, DomainDef> = {
  coding: {
    fields: [
      { name: 'repo', description: 'Repository name or URL', keywords: ['repo', 'repository', 'github', 'gitlab', 'bitbucket', 'git clone'] },
      { name: 'module', description: 'Module or package being worked on', keywords: ['module', 'package', 'service', 'component', 'app', 'library'] },
      { name: 'tech_stack', description: 'Technologies used', keywords: ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'react', 'vue', 'svelte', 'next.js', 'node', 'express', 'fastify', 'postgresql', 'mysql', 'mongodb', 'redis', 'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'tailwind', 'prisma', 'drizzle', 'graphql', 'rest', 'grpc'] },
      { name: 'api_contracts', description: 'API contracts and endpoints', keywords: ['endpoint', 'api', 'route', 'handler', 'request', 'response', 'contract', 'schema', 'POST', 'GET', 'PUT', 'DELETE', 'PATCH'] },
      { name: 'acceptance_criteria', description: 'Acceptance criteria', keywords: ['acceptance', 'criteria', 'requirement', 'must', 'should', 'expected behavior', 'done when', 'definition of done'] },
      { name: 'code_style', description: 'Code style and conventions', keywords: ['style', 'convention', 'lint', 'eslint', 'prettier', 'formatting', 'naming', 'pattern'] },
      { name: 'dependencies', description: 'Dependencies and integrations', keywords: ['dependency', 'depends on', 'integration', 'import', 'requires', 'prerequisite', 'blocker'] },
    ],
  },
  writing: {
    fields: [
      { name: 'audience', description: 'Target audience', keywords: ['audience', 'reader', 'target', 'demographic', 'user', 'customer', 'stakeholder'] },
      { name: 'tone', description: 'Writing tone', keywords: ['tone', 'voice', 'style', 'formal', 'casual', 'professional', 'friendly', 'technical'] },
      { name: 'key_points', description: 'Key points to cover', keywords: ['key point', 'main point', 'topic', 'theme', 'message', 'thesis', 'argument', 'takeaway'] },
      { name: 'brand_guidelines', description: 'Brand guidelines', keywords: ['brand', 'guideline', 'identity', 'logo', 'color', 'design system'] },
      { name: 'word_count_target', description: 'Target word count', keywords: ['word count', 'length', 'words', 'characters', 'pages'] },
      { name: 'references', description: 'References and sources', keywords: ['reference', 'source', 'citation', 'link', 'url', 'bibliography'] },
    ],
  },
  research: {
    fields: [
      { name: 'data_sources', description: 'Data sources', keywords: ['data source', 'dataset', 'database', 'survey', 'sample', 'corpus', 'api'] },
      { name: 'methodology', description: 'Research methodology', keywords: ['methodology', 'method', 'approach', 'framework', 'analysis', 'experiment', 'hypothesis'] },
      { name: 'findings', description: 'Key findings', keywords: ['finding', 'result', 'outcome', 'conclusion', 'discovery', 'insight', 'observation'] },
      { name: 'trends', description: 'Observed trends', keywords: ['trend', 'pattern', 'growth', 'decline', 'shift', 'change', 'trajectory'] },
      { name: 'confidence_level', description: 'Confidence level', keywords: ['confidence', 'certainty', 'reliability', 'validity', 'significance', 'p-value', 'margin'] },
      { name: 'citations', description: 'Citations', keywords: ['citation', 'cite', 'reference', 'paper', 'journal', 'author', 'doi', 'isbn'] },
    ],
  },
  strategy: {
    fields: [
      { name: 'objectives', description: 'Strategic objectives', keywords: ['objective', 'goal', 'target', 'kpi', 'okr', 'metric', 'milestone'] },
      { name: 'decisions', description: 'Key decisions', keywords: ['decision', 'decided', 'chose', 'approved', 'rejected', 'agreed', 'resolved'] },
      { name: 'risks', description: 'Risks identified', keywords: ['risk', 'threat', 'vulnerability', 'concern', 'issue', 'mitigation', 'contingency'] },
      { name: 'dependencies', description: 'Dependencies', keywords: ['dependency', 'depends on', 'prerequisite', 'blocker', 'requires', 'upstream', 'downstream'] },
      { name: 'timeline', description: 'Timeline', keywords: ['timeline', 'deadline', 'schedule', 'date', 'milestone', 'quarter', 'sprint', 'phase'] },
      { name: 'stakeholders', description: 'Stakeholders', keywords: ['stakeholder', 'owner', 'responsible', 'accountable', 'team', 'department', 'lead'] },
    ],
  },
};

const VALID_DOMAINS = ['coding', 'writing', 'research', 'strategy', 'general'];

// --- Domain inference from task text ---

const DOMAIN_PATTERNS: [string, RegExp[]][] = [
  ['coding', [
    /\b(write|build|implement|create|fix|debug|refactor|deploy|code|develop|program|api|endpoint|function|class|module|test|lint|compile)\b/i,
    /\b(bug|feature|pr|pull request|commit|branch|merge|release)\b/i,
  ]],
  ['writing', [
    /\b(write|draft|compose|edit|proofread|article|blog|post|essay|copy|content|newsletter|documentation)\b/i,
    /\b(audience|tone|headline|paragraph|publish)\b/i,
  ]],
  ['research', [
    /\b(research|analyze|investigate|study|survey|data|findings|methodology|hypothesis|experiment|literature review)\b/i,
    /\b(trend|correlation|statistical|dataset|sample size)\b/i,
  ]],
  ['strategy', [
    /\b(strategy|plan|roadmap|objective|decision|risk|stakeholder|timeline|budget|prioritize|initiative)\b/i,
    /\b(okr|kpi|swot|competitive|market|growth)\b/i,
  ]],
];

export function inferDomain(task: string): string {
  const scores: Record<string, number> = {};
  for (const [domain, patterns] of DOMAIN_PATTERNS) {
    let score = 0;
    for (const pattern of patterns) {
      const matches = task.match(new RegExp(pattern, 'gi'));
      if (matches) score += matches.length;
    }
    if (score > 0) scores[domain] = score;
  }

  // "write code" should be coding, not writing — coding gets priority if both match
  if (scores.coding && scores.writing) {
    const codingSignals = /\b(code|implement|api|endpoint|function|class|bug|fix|deploy|compile|test)\b/i;
    if (codingSignals.test(task)) {
      scores.coding += 3;
    }
  }

  let best = 'general';
  let bestScore = 0;
  for (const [domain, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = domain;
    }
  }
  return best;
}

// --- Schema extraction from fragments ---

export function extractSchema(domain: string, fragments: KnowledgeFragment[]): Record<string, any> | null {
  if (domain === 'general' || !DOMAIN_DEFS[domain]) return null;

  const def = DOMAIN_DEFS[domain];
  const schema: Record<string, any> = {};

  for (const field of def.fields) {
    const matches: string[] = [];

    for (const fragment of fragments) {
      const text = fragment.text.toLowerCase();
      const hasKeyword = field.keywords.some(kw => text.includes(kw.toLowerCase()));
      if (hasKeyword) {
        // Extract relevant sentences containing the keywords
        const sentences = fragment.text.split(/[.。!！?？\n]+/).filter(s => s.trim().length > 5);
        for (const sentence of sentences) {
          const sentLower = sentence.toLowerCase();
          if (field.keywords.some(kw => sentLower.includes(kw.toLowerCase()))) {
            matches.push(sentence.trim());
          }
        }
      }
    }

    // Deduplicate and limit
    const unique = [...new Set(matches)].slice(0, 10);

    // For fields that are typically single-value, join; for list-type, keep array
    if (['tech_stack', 'dependencies', 'key_points', 'data_sources', 'citations', 'references', 'stakeholders'].includes(field.name)) {
      schema[field.name] = unique;
    } else {
      schema[field.name] = unique.join('. ') || '';
    }
  }

  return schema;
}

export function isValidDomain(domain: string): boolean {
  return VALID_DOMAINS.includes(domain);
}
