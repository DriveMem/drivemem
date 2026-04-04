import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, desc, sql, and, isNotNull } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { requireAuth } from '../plugins/auth.js';

export default async function reportsRoutes(fastify: FastifyInstance) {
  // POST /generate — 生成分析报告
  fastify.post('/generate', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;
    const body = (request.body || {}) as { type?: string };
    const reportType = body.type || 'analysis'; // 'analysis' | 'study'
    
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
    
    const analysisPrompt = `你是专业的文档分析师。基于用户知识库中的文件信息，生成一份结构化的文档分析报告。

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

    const studyPrompt = `你是专业的学习助手。基于用户上传的文件内容，生成一份结构化的学习笔记。

## 用户文件（${userFiles.length} 个）
${fileSummaries}

请生成以下格式的学习笔记：

## 📝 核心知识点
列出所有文件中的核心知识点，按主题分组，每个知识点用简洁的一句话概括。

## 🔑 重点难点
标注哪些知识点是重点（必须掌握）和难点（容易混淆或理解困难），给出理解提示。

## ❓ 模拟测试题
基于文件内容出 5 道测试题（选择题或简答题），每题附标准答案和解析。

## 📋 学习建议
给出 2-3 条具体的学习路径建议，包括学习顺序、重点关注方向、拓展阅读方向。

用中文，语气友好鼓励。内容要有实际学习价值。`;

    const competitivePrompt = `你是专业的竞品分析师。基于用户上传的产品和竞品相关文件，生成一份结构化的竞品分析报告。

## 用户文件（${userFiles.length} 个）
${fileSummaries}

## 文件间关联
${linkInfo}

请生成以下格式的竞品分析报告：

## 📊 产品概览
简要介绍每个涉及的产品/公司，一句话概括其核心定位。

## 🔍 功能对比矩阵
用表格对比各产品的核心功能、特色能力、定价模式、目标用户等维度。

## ⚡ 差异化分析
深入分析各产品的独特优势和劣势，指出真正的差异化壁垒。

## 📈 市场洞察
基于文件内容分析市场趋势、竞争格局、潜在机会和风险。

## 💡 行动建议
给出 3-5 条具体的、可执行的战略建议（产品定位、功能优先级、市场策略等）。

用中文，语气专业。报告应有战略价值，适合管理层阅读。`;

    const prompts: Record<string, string> = { analysis: analysisPrompt, study: studyPrompt, competitive: competitivePrompt };
    const prompt = prompts[reportType] || analysisPrompt;
    
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

  // POST /:id/share — 创建报告分享链接
  fastify.post('/:id/share', { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;

    const [report] = await db.select().from(schema.reports).where(and(eq(schema.reports.id, id), eq(schema.reports.userId, userId)));
    if (!report) {
      return reply.status(404).send({ error: 'Report not found' });
    }

    // Check if share already exists
    const [existing] = await db.select().from(schema.shares).where(and(eq(schema.shares.reportId, id), eq(schema.shares.userId, userId)));
    if (existing) {
      return reply.send({ token: existing.token, url: `${process.env.FRONTEND_URL || 'https://drive.verrrnm.cloud'}/share/report/${existing.token}` });
    }

    const token = randomBytes(16).toString('hex');

    await db.insert(schema.shares).values({
      token,
      userId,
      type: 'report',
      reportId: id,
    });

    return reply.status(201).send({
      token,
      url: `${process.env.FRONTEND_URL || 'https://drive.verrrnm.cloud'}/share/report/${token}`,
    });
  });
}
