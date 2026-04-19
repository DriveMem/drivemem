export const CONVERSATION_TEMPLATES = [
  {
    id: 'analyze',
    emoji: '📊',
    title: 'Analyze File',
    description: 'Analyze file content in detail, extract key information and insights',
    systemPrompt: 'Please analyze this file in detail, extracting key information and insights.',
  },
  {
    id: 'summary',
    emoji: '📝',
    title: 'Write Summary',
    description: 'Write a concise summary of the file with key points and conclusions',
    systemPrompt: 'Please write a concise summary of this file, including key points and conclusions.',
  },
  {
    id: 'qa',
    emoji: '❓',
    title: 'Q&A',
    description: 'Answer your questions accurately based on file content',
    systemPrompt: 'I will ask questions about this file. Please answer accurately based on the file content.',
  },
  {
    id: 'compare',
    emoji: '🔄',
    title: 'Compare Files',
    description: 'Compare similarities and differences between files, list key differences',
    systemPrompt: 'Please compare the similarities and differences between these files, listing key differences.',
  },
] as const;

export type ConversationTemplate = typeof CONVERSATION_TEMPLATES[number];
