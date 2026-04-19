import { Worker, Queue } from 'bullmq';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { createNotificationDeduped } from '../services/notification.service.js';
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
  
  const prompt = `File A: ${file.name}\nSummary A: ${file.summary.substring(0, 150)}\n\nMost similar files:\n${pairDescs}\n\nAnalyze deep connections between File A and these files. Requirements:\n1. Be specific — cite concrete shared points, contradictions, or trends\n2. Title should be informative (e.g. "Both recommend PostgreSQL" not "Related topic")\n3. Description should reference specific content\n\nTypes:\n- relation: concrete content connection or supporting arguments\n- contradiction: different views on a specific issue\n- trend: trackable trend or change across files\n\nReturn JSON array: [{"relatedFileName":"File B name","type":"relation|contradiction|trend","title":"specific title (max 10 words)","description":"description citing content (max 30 words)"}]\nReturn ONLY JSON.`;
  
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
      await createNotificationDeduped({
        userId,
        type: 'insight_generated',
        title: '💡 新洞察',
        message: `AI 发现「${file.name}」和「${matchedFile.name}」之间的关联：${ins.title}`,
      });
      
      // Dispatch webhook
      try {
        const { dispatchWebhook } = await import('../services/webhook.service.js');
        await dispatchWebhook(userId, 'insight.discovered', { title: ins.title, sourceFile: file.name, relatedFile: matchedFile.name });
      } catch { /* non-blocking */ }
    }
    
    console.log(`[insight] Generated insights for ${fileId}`);
  } catch (err) {
    console.warn('[insight] Failed:', (err as Error).message);
  }
}, { connection, concurrency: 1, lockDuration: 2 * 60 * 1000 });

worker.on('error', (err) => console.error('[insight-worker] Error:', err.message));
console.log('[insight-worker] Started');
