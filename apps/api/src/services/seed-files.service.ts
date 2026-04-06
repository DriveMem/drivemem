import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { files } from '../db/schema.js';
import { s3Client } from './s3.service.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../lib/config.js';
import { fileParseQueue } from '../lib/queue.js';

interface SeedFile {
  name: string;
  content: string;
  mimeType: string;
}

const SEED_FILES: SeedFile[] = [
  {
    name: 'AI Drive 使用指南.md',
    mimeType: 'text/markdown',
    content: `# AI Drive 使用指南

欢迎使用 AI Drive —— 你的个人 AI 知识库！

## 🚀 快速开始

### 1. 上传文件
- 点击左上角「上传」按钮，或直接拖拽文件到页面
- 支持 PDF、Word、PPT、Excel、TXT、Markdown 等格式
- 免费版提供 5GB 存储空间

### 2. AI 自动解析
- 上传后 AI 自动解析文件内容，建立知识索引
- 解析完成后文件状态变为「已索引」
- 通常几秒到几分钟完成（取决于文件大小）

### 3. AI 对话
- 点击左侧「新对话」开始与 AI 交流
- 你可以问任何关于你文件的问题
- AI 会引用具体文件和段落来回答

### 4. 全文搜索
- 按 \`⌘K\`（Mac）或 \`Ctrl+K\`（Windows）打开全局搜索
- 在所有文件中快速定位关键信息

### 5. 文件夹管理
- 创建文件夹来组织你的文件
- AI 会自动推荐文件分类

## 💡 进阶技巧

- **跨文件问答**：选择多个文件或文件夹作为对话范围
- **生成报告**：让 AI 基于你的文件生成分析报告
- **知识剪藏**：保存重要的 AI 回答片段

## 📬 反馈

如有问题或建议，欢迎联系我们！
`,
  },
  {
    name: '示例：竞品分析报告.md',
    mimeType: 'text/markdown',
    content: `# 竞品分析报告：AI 文档助手市场

> 这是一个示例报告，展示 AI Drive 的文档分析能力。

## 1. 市场概览

AI 文档助手市场正在快速增长，预计 2026 年全球市场规模将达到 50 亿美元。

**主要驱动力：**
- 远程办公趋势加速信息管理需求
- 大语言模型技术突破使文档理解成为可能
- 企业知识管理痛点日益突出

## 2. 主要竞品对比

| 产品 | 定位 | 核心功能 | 价格 |
|------|------|----------|------|
| Notion AI | 笔记+AI | 写作辅助、摘要 | $10/月 |
| ChatPDF | PDF 问答 | 单文件问答 | 免费增值 |
| AI Drive | 个人知识库 | 多文件问答、知识图谱 | 免费增值 |

## 3. 差异化优势

AI Drive 的核心差异化在于：

1. **多文件跨文档问答** — 不仅限于单个文件
2. **知识时间线** — 按时间轴浏览知识积累
3. **引用溯源** — 每个回答都标注来源
4. **中文优先** — 针对中文文档深度优化

## 4. 市场机会

- 中文市场缺乏成熟的 AI 文档助手产品
- 个人用户对「第二大脑」需求日益增长
- 小团队知识协作场景潜力巨大

## 5. 建议

> 聚焦个人用户市场，以免费增值模式快速获客，通过 AI 对话体验建立口碑。

---
*本报告由 AI Drive 示例数据生成*
`,
  },
];

/**
 * Seed sample files for a new user.
 * Creates DB records, uploads to S3, and triggers parse worker.
 * Runs in background (fire-and-forget) so signup response is not delayed.
 */
export async function seedFilesForUser(userId: string): Promise<void> {
  try {
    for (const seed of SEED_FILES) {
      const fileId = crypto.randomUUID();
      const s3Key = `${userId}/${fileId}/${seed.name}`;
      const buf = Buffer.from(seed.content, 'utf-8');

      // Upload to S3/MinIO
      await s3Client.send(
        new PutObjectCommand({
          Bucket: config.AWS_S3_BUCKET,
          Key: s3Key,
          Body: buf,
          ContentType: seed.mimeType,
        }),
      );

      // Insert DB record
      await db.insert(files).values({
        id: fileId,
        name: seed.name,
        originalName: seed.name,
        mimeType: seed.mimeType,
        size: buf.byteLength,
        status: 'parsing',
        userId,
        s3Key,
      });

      // Trigger parse worker for embedding generation
      await fileParseQueue.add(
        'parse',
        { fileId, userId, s3Key, mimeType: seed.mimeType },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    }

    console.log(`[seed] Seeded ${SEED_FILES.length} sample files for user ${userId}`);
  } catch (err) {
    // Non-blocking: log error but don't fail signup
    console.error('[seed] Failed to seed sample files:', err);
  }
}
