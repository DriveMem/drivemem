import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { files, folders, workItems, notifications } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { uploadObject } from './s3.service.js';
import { fileParseQueue } from '../lib/queue.js';

interface DemoFile {
  name: string;
  content: string;
  mimeType: string;
}

const DEMO_FILES: DemoFile[] = [
  {
    name: 'Welcome to DriveMem.md',
    mimeType: 'text/markdown',
    content: `# Welcome to DriveMem

DriveMem is your AI agents' shared memory. Everything stored here is automatically available to all your AI tools.

## What you can do:
- Ask questions about your knowledge in Chat
- Connect Cursor, Claude, or ChatGPT via MCP
- Upload documents, notes, and decisions
- Watch as DriveMem discovers connections between your knowledge
`,
  },
  {
    name: 'Example — Product Decision.md',
    mimeType: 'text/markdown',
    content: `# Product Decision: Choose PostgreSQL over MongoDB

Date: 2026-04-01
Decision: Use PostgreSQL as our primary database

## Reasoning:
- Strong ACID compliance for data integrity
- Excellent JSON support for flexible schemas
- Mature ecosystem and community support
- Better performance for complex queries

## Alternatives Considered:
- MongoDB: Good for unstructured data but weaker consistency
- Redis: Fast but not suitable as primary store
`,
  },
  {
    name: 'Example — Meeting Notes.md',
    mimeType: 'text/markdown',
    content: `# Team Meeting — Sprint Planning

Date: 2026-04-15
Attendees: Product, Engineering, Design

## Key Decisions:
- Prioritize user onboarding flow
- Launch beta by end of month
- Focus on MCP integration for Cursor users

## Action Items:
- [ ] Design: Create onboarding wireframes
- [ ] Engineering: Implement webhook API
- [x] Product: Define pricing tiers
`,
  },
];

/**
 * Seed a demo project with sample files, work items, and activity
 * for a newly registered user. Fire-and-forget from signup.
 */
export async function seedDemoProject(userId: string): Promise<void> {
  try {
    // Idempotent: skip if user already has files
    const [existing] = await db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.userId, userId));

    if (Number(existing?.count || 0) > 0) return;

    // 1. Create "Getting Started" folder
    const folderId = crypto.randomUUID();
    await db.insert(folders).values({
      id: folderId,
      name: 'Getting Started',
      userId,
    });

    // 2. Create demo files (S3 + DB + parse queue)
    const fileIds: string[] = [];
    for (let i = 0; i < DEMO_FILES.length; i++) {
      const demo = DEMO_FILES[i];
      const fileId = crypto.randomUUID();
      fileIds.push(fileId);
      const s3Key = `users/${userId}/files/${fileId}/${demo.name}`;
      const buf = Buffer.from(demo.content, 'utf-8');
      // Spread createdAt across last few days so timeline looks natural
      const daysAgo = Math.floor((DEMO_FILES.length - 1 - i) * 2);
      const createdAt = new Date(Date.now() - daysAgo * 86400000);

      await uploadObject(s3Key, buf, demo.mimeType);

      await db.insert(files).values({
        id: fileId,
        name: demo.name,
        originalName: demo.name,
        mimeType: demo.mimeType,
        size: buf.byteLength,
        status: 'parsing',
        userId,
        folderId,
        s3Key,
        createdAt,
        isSample: true,
      });

      await fileParseQueue.add(
        'parse',
        { fileId, userId, s3Key, mimeType: demo.mimeType },
        { attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
      );
    }

    // 3. Create 2 work items from demo files
    await db.insert(workItems).values([
      {
        userId,
        folderId,
        type: 'decision',
        title: 'Use PostgreSQL as primary database',
        description: 'Decision from product discussion — strong ACID compliance, excellent JSON support.',
        status: 'active',
        sourceFileId: fileIds[1], // Product Decision file
        priority: 'high',
      },
      {
        userId,
        folderId,
        type: 'todo',
        title: 'Implement webhook API',
        description: 'Action item from sprint planning meeting.',
        status: 'active',
        sourceFileId: fileIds[2], // Meeting Notes file
        priority: 'medium',
      },
    ]);

    // 4. Seed activity log (notifications) so Activity Feed has content
    await db.insert(notifications).values([
      {
        userId,
        type: 'file_upload',
        title: 'uploaded',
        message: 'Welcome to DriveMem.md',
        createdAt: new Date(Date.now() - 4 * 86400000),
      },
      {
        userId,
        type: 'file_upload',
        title: 'uploaded',
        message: 'Example — Product Decision.md',
        createdAt: new Date(Date.now() - 2 * 86400000),
      },
      {
        userId,
        type: 'file_upload',
        title: 'uploaded',
        message: 'Example — Meeting Notes.md',
        createdAt: new Date(Date.now() - 10000),
      },
    ]);

    console.log(`[demo-seed] Seeded demo project for user ${userId}`);
  } catch (err) {
    console.error('[demo-seed] Failed to seed demo project:', err);
  }
}
