import { Worker, Queue } from 'bullmq';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { embedTexts } from '../services/embedding.service.js';
import { searchSimilar } from '../services/vector.service.js';

const connection = { host: 'localhost', port: 6379 };

const worker = new Worker('insight-generate', async (job) => {
  const { fileId, userId } = job.data;
  
  // Get the source file
  const [file] = await db.select({ 
    id: schema.files.id, name: schema.files.name, summary: schema.files.summary 
  }).from(schema.files).where(eq(schema.files.id, fileId));
  
  if (!file?.summary) return;
  
  // Get embedding for this file's summary
  const [queryVec] = await embedTexts([file.summary.substring(0, 200)]);
  
  // Search for similar files (excluding self)
  const similar = await searchSimilar({
    userId, query: queryVec, scopeType: 'all', limit: 5,
  });
  
  // Filter: score > 0.7, exclude self, take top 3
  const candidates = similar
    .filter(s => s.fileId !== fileId && s.score > 0.7)
    .slice(0, 3);
  
  if (candidates.length === 0) return;
  
  // Get candidate file summaries
  const candidateFiles = [];
  for (const c of candidates) {
    const [f] = await db.select({ id: schema.files.id, name: schema.files.name, summary: schema.files.summary })
      .from(schema.files).where(eq(schema.files.id, c.fileId));
    if (f) candidateFiles.push({ ...f, score: c.score });
  }
  
  if (candidateFiles.length === 0) return;
  
  // Build LLM prompt
  const { chat } = await import('../services/llm.service.js');
  const pairDescs = candidateFiles.map(cf => 
    `文件B：${cf.name}\n摘要B：${cf.summary?.substring(0, 150)}\n相似度：${cf.score.toFixed(2)}`
  ).join('\n---\n');
  
  const prompt = `文件A：${file.name}\n摘要A：${file.summary.substring(0, 150)}\n\n以下是与文件A最相似的文件：\n${pairDescs}\n\n分析文件A和以下文件之间的深层关联。要求：\n1. 不要只说"两个文件讨论相同主题"——要指出具体的共同观点、矛盾论述或发展趋势\n2. title 要具体有信息量（如"用户增长策略一致"而非"相关主题"）\n3. description 要引用文件中的具体内容或数据点\n\n类型选择：\n- relation：两个文件有具体的内容关联或互相支持的论点\n- contradiction：两个文件在某个具体问题上持不同观点\n- trend：两个文件反映了某个可追踪的趋势或变化\n\n返回JSON数组：[{"relatedFileName":"文件B名","type":"relation|contradiction|trend","title":"具体标题(15字内)","description":"引用具体内容的描述(50字内)"}]\n只返回JSON，不要其他文字。`;
  
  try {
    const result = await chat([{ role: 'user', content: prompt }]);
    const jsonMatch = result.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return;
    
    const insightsList = JSON.parse(jsonMatch[0]);
    
    for (const ins of insightsList.slice(0, 3)) {
      const matchedFile = candidateFiles.find(cf => 
        cf.name.includes(ins.relatedFileName) || ins.relatedFileName.includes(cf.name)
      );
      if (!matchedFile || !ins.title || !ins.description) continue;
      
      // Check duplicate
      const existing = await db.select().from(schema.insights).where(
        and(
          eq(schema.insights.sourceFileId, fileId),
          eq(schema.insights.relatedFileId, matchedFile.id),
          eq(schema.insights.userId, userId)
        )
      );
      if (existing.length > 0) continue;
      
      await db.insert(schema.insights).values({
        userId,
        sourceFileId: fileId,
        relatedFileId: matchedFile.id,
        type: ['relation', 'contradiction', 'trend'].includes(ins.type) ? ins.type : 'relation',
        title: ins.title.slice(0, 50),
        description: ins.description.slice(0, 200),
        similarityScore: matchedFile.score,
      });
      
      // Also write notification
      await db.insert(schema.notifications).values({
        userId,
        type: 'insight_generated',
        title: '💡 新洞察',
        message: `AI 发现「${file.name}」和「${matchedFile.name}」之间的关联：${ins.title}`,
      });
    }
    
    console.log(`[insight] Generated insights for ${fileId}`);
  } catch (err) {
    console.warn('[insight] Failed:', (err as Error).message);
  }
}, { connection, concurrency: 1 });

worker.on('error', (err) => console.error('[insight-worker] Error:', err.message));
console.log('[insight-worker] Started');
