export interface ValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateContextPack(pack: any): ValidationResult {
  const missing: string[] = [];

  if (!pack.task || typeof pack.task !== 'string' || pack.task.trim() === '') {
    missing.push('task');
  }
  if (!Array.isArray(pack.next_steps) || pack.next_steps.length === 0) {
    missing.push('next_steps');
  }
  if (!pack.context || typeof pack.context !== 'object') {
    missing.push('context');
  } else {
    const ctx = pack.context;
    const hasContent =
      (Array.isArray(ctx.decisions) && ctx.decisions.length > 0) ||
      (Array.isArray(ctx.files) && ctx.files.length > 0) ||
      (Array.isArray(ctx.conversations) && ctx.conversations.length > 0) ||
      (Array.isArray(ctx.key_facts) && ctx.key_facts.length > 0);
    if (!hasContent) {
      missing.push('context (at least one of: decisions, files, conversations, key_facts)');
    }
  }

  return { valid: missing.length === 0, missing };
}
