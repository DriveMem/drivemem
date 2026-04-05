export const CONVERSATION_TEMPLATES = [
  {
    id: 'analyze',
    emoji: '📊',
    title: '分析文件',
    description: '详细分析文件内容，提取关键信息和洞察',
    systemPrompt: '请详细分析这份文件的内容，提取关键信息和洞察。',
  },
  {
    id: 'summary',
    emoji: '📝',
    title: '写摘要',
    description: '为文件写一份简洁的摘要，包含要点和结论',
    systemPrompt: '请为这份文件写一份简洁的摘要，包含要点和结论。',
  },
  {
    id: 'qa',
    emoji: '❓',
    title: '提问答疑',
    description: '基于文件内容准确回答你的问题',
    systemPrompt: '我会就这份文件提问，请基于文件内容准确回答。',
  },
  {
    id: 'compare',
    emoji: '🔄',
    title: '比较文件',
    description: '比较多份文件的异同点，列出关键差异',
    systemPrompt: '请比较这些文件的异同点，列出关键差异。',
  },
] as const;

export type ConversationTemplate = typeof CONVERSATION_TEMPLATES[number];
