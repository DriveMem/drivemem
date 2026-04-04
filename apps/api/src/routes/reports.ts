import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';

export default async function reportsRoutes(fastify: FastifyInstance) {
  // POST /generate — 生成分析报告
  fastify.post('/generate', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    
    // Get all user's indexed files with summaries
    const userFiles = await db.select({ 
      name: schema.files.name, 
      summary: schema.files.summary,
      mimeType: schema.files.mimeType,
      suggestedFolder: schema.files.suggestedFolder,
      createdAt: schema.files.createdAt,
    })
      .from(schema.files)
      .where(and(eq(schema.files.userId, userId), sql`${schema.files.summary} IS NOT NULL`))
      .orderBy(desc(schema.files.createdAt));
    
    if (userFiles.length === 0) {
      return reply.status(400).send({ error: '没有可分析的文件。请先上传文件。' });
    }
    
    // Get knowledge links
    const links = await db.select({
      relationType: schema.knowledgeLinks.relationType,
      description: schema.knowledgeLinks.description,
    })
      .from(schema.knowledgeLinks)
      .where(eq(schema.knowledgeLinks.userId, userId));
    
    const { chat } = await import('../services/llm.service.js');
    
    const fileSummaries = userFiles.map(f => 
      `- **${f.name}**（${f.mimeType}）：${f.summary?.substring(0, 200)}`
    ).join('\n');
    
    const linkInfo = links.length > 0
      ? links.map(l => `- ${l.relationType}: ${l.description}`).join('\n')
      : '暂无文件间关联';
    
    const prompt = `你是专业的文档分析师。基于用户知识库中的文件信息，生成一份结构化的文档分析报告。

## 用户文件（${userFiles.length} 个）
${fileSummaries}

## 文件间关联
${linkInfo}

请生成以下格式的分析报告：

## 📋 文档概要
对每个文件用一句话概括核心内容。

## 🔗 关键发现
分析文件之间的关联、共同主题、互补信息。如果有矛盾之处也要指出。

## 📊 对比矩阵
如果有多个相关文件，用表格对比它们的维度（主题、范围、深度等）。

## 💡 行动建议
基于分析结果，给出 2-3 条具体的、可执行的建议（如：可以深入研究某个方向、某些文件可以合并整理、知识库有哪些空白需要补充等）。

用中文，语气专业友好。报告应有实际价值，不要空话。`;
    
    try {
      const report = await chat([{ role: 'user', content: prompt }]);
      
      // Save report
      const [saved] = await db.insert(schema.reports).values({
        userId,
        content: report,
      }).returning();
      
      return reply.status(201).send({ id: saved.id, report, createdAt: saved.createdAt });
    } catch (err) {
      return reply.status(500).send({ error: '报告生成失败，请稍后重试' });
    }
  });
  
  // GET /latest — 获取最近的报告
  fastify.get('/latest', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    
    const [latest] = await db.select()
      .from(schema.reports)
      .where(eq(schema.reports.userId, userId))
      .orderBy(desc(schema.reports.createdAt))
      .limit(1);
    
    if (!latest) {
      return reply.send({ report: null });
    }
    
    return reply.send({ id: latest.id, report: latest.content, createdAt: latest.createdAt });
  });
}
