import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { requireAuth } from '../plugins/auth.js';
import { uploadObject } from '../services/s3.service.js';
import { randomUUID } from 'crypto';
import { Queue } from 'bullmq';

const DEMO_FILES = [
  {
    name: 'AI产品设计入门.md',
    content: `# AI 产品设计入门

## 1. 什么是 AI 产品
AI 产品是利用人工智能技术为用户提供智能化服务的产品。核心特征包括：
- **数据驱动**：通过数据学习和优化
- **智能决策**：自动化复杂决策过程
- **个性化**：根据用户行为定制体验

## 2. AI 产品设计原则
1. **以用户为中心**：技术是手段，用户价值是目标
2. **渐进式智能**：先解决核心问题，再扩展能力
3. **透明可控**：用户需要理解 AI 在做什么
4. **容错设计**：AI 会犯错，需要优雅降级

## 3. 常见 AI 产品类型
- 智能助手（ChatGPT、Claude）
- 推荐系统（Netflix、Spotify）
- 内容生成（DALL·E、Midjourney）
- 知识管理（AI Drive、NotebookLM）
`,
    mimeType: 'text/markdown',
  },
  {
    name: '2024年科技趋势报告.md',
    content: `# 2024年科技趋势报告

## 核心发现
1. **大语言模型成为基础设施** — 从实验性工具变为企业核心能力
2. **AI Agent 自主协作兴起** — 多 agent 系统开始替代人工流程
3. **边缘 AI 部署加速** — 端侧推理能力快速提升
4. **AI 安全治理成为焦点** — 全球 AI 监管框架逐步形成

## 关键数据
| 领域 | 2023 | 2024 预测 |
|------|------|---------|
| AI 市场规模 | $150B | $200B+ |
| AI 开发者数量 | 300K | 500K+ |
| 企业 AI 采用率 | 35% | 55% |
| AI 相关论文 | 40K | 60K+ |

## 趋势分析
- **多模态模型**成为标配（文本+图像+音频）
- **RAG（检索增强生成）**技术广泛应用
- **小模型微调**替代大模型直接使用
- **AI 原生应用**取代"AI 增强"应用
`,
    mimeType: 'text/markdown',
  },
  {
    name: '项目管理最佳实践.md',
    content: `# 项目管理最佳实践

## 敏捷开发核心
- **短迭代周期**：每 1-2 周一个 sprint
- **每日站会**：15 分钟同步进度和阻塞
- **回顾会议**：每个 sprint 结束后反思改进
- **持续集成**：代码提交后自动构建测试

## 团队协作原则
1. **透明沟通**：信息不应被私藏
2. **自组织**：团队自行决定如何完成工作
3. **跨功能**：减少角色依赖
4. **持续改进**：每次比上次好一点

## 工具推荐
| 场景 | 推荐工具 |
|------|---------|
| 项目管理 | Linear, Jira, Notion |
| 文档协作 | Notion, Confluence |
| 代码管理 | GitHub, GitLab |
| 知识管理 | AI Drive, Obsidian |
| 沟通 | Slack, Discord |

## 常见反模式
- ❌ 过度计划，不够执行
- ❌ 没有回顾，重复犯错
- ❌ 技术债积累不管
- ❌ 沟通不透明，信息孤岛
`,
    mimeType: 'text/markdown',
  },
];

export default async function onboardingRoutes(fastify: FastifyInstance) {
  fastify.post('/demo-files', { preHandler: [requireAuth] }, async (request, reply) => {
    const userId = request.user!.id;

    // Idempotent: skip if user already has files
    const [existing] = await db.select({ count: sql<number>`count(*)` })
      .from(schema.files)
      .where(eq(schema.files.userId, userId));

    if (Number(existing?.count || 0) > 0) {
      return reply.send({ message: '已有文件，跳过示例创建', created: 0 });
    }

    const queue = new Queue('file-parse', { connection: { host: 'localhost', port: 6379 } });
    let created = 0;

    try {
      for (const demo of DEMO_FILES) {
        const fileId = randomUUID();
        const s3Key = `users/${userId}/files/${fileId}/${demo.name}`;
        const buffer = Buffer.from(demo.content, 'utf-8');

        await uploadObject(s3Key, buffer, demo.mimeType);

        await db.insert(schema.files).values({
          id: fileId,
          name: demo.name,
          originalName: demo.name,
          mimeType: demo.mimeType,
          size: buffer.length,
          status: 'parsing',
          userId,
          s3Key,
        });

        await queue.add('parse', { fileId, userId, s3Key, mimeType: demo.mimeType });
        created++;
      }

      // Create default folders (no unique constraint, use try/catch)
      for (const folderName of ['工作文档', '学习资料']) {
        try {
          await db.insert(schema.folders).values({ name: folderName, userId });
        } catch {
          // folder may already exist, ignore
        }
      }
    } finally {
      await queue.close();
    }

    return reply.status(201).send({ message: `已创建 ${created} 个示例文件`, created });
  });
}
