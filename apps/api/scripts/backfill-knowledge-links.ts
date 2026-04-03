import { eq, and, sql } from 'drizzle-orm';
import { db } from '../src/db/index.js';
import * as schema from '../src/db/schema.js';
import { chat } from '../src/services/llm.service.js';

async function backfill() {
  // Get all users who have indexed files with summaries
  const usersWithFiles = await db.selectDistinct({ userId: schema.files.userId })
    .from(schema.files)
    .where(and(
      eq(schema.files.status, 'indexed'),
      sql`${schema.files.summary} IS NOT NULL`
    ));

  console.log(`Found ${usersWithFiles.length} users with indexed files`);

  for (const { userId } of usersWithFiles) {
    const userFiles = await db.select({
      id: schema.files.id,
      name: schema.files.name,
      summary: schema.files.summary,
    })
      .from(schema.files)
      .where(and(
        eq(schema.files.userId, userId),
        eq(schema.files.status, 'indexed'),
        sql`${schema.files.summary} IS NOT NULL`
      ));

    console.log(`User ${userId}: ${userFiles.length} files`);
    if (userFiles.length < 2) continue;

    // For each file, compare with all others
    for (let i = 0; i < userFiles.length; i++) {
      const current = userFiles[i];
      const others = userFiles.filter((_, idx) => idx !== i);
      const fileList = others.map(f => `[${f.name}]: ${f.summary?.substring(0, 150)}`).join('\n');

      const linkPrompt = `当前文件：${current.name}\n摘要：${current.summary!.substring(0, 200)}\n\n其他文件：\n${fileList}\n\n分析当前文件和每个其他文件的关联。对于有明确关联的文件对，输出一行：\n文件名|关联类型|描述\n\n关联类型只能是：similar（主题相似）、complementary（信息互补）、contradictory（观点矛盾）\n描述用中文，不超过30字。\n如果没有关联，输出"无"。`;

      try {
        const linkResult = await chat([{ role: 'user', content: linkPrompt }]);
        const lines = linkResult.split('\n').filter(l => l.includes('|'));

        for (const line of lines) {
          const [fileName, relType, desc] = line.split('|').map(s => s.trim());
          if (!fileName || !relType || !desc) continue;
          if (!['similar', 'complementary', 'contradictory'].includes(relType)) continue;

          const matchedFile = others.find(f => f.name.includes(fileName) || fileName.includes(f.name));
          if (matchedFile) {
            const existing = await db.select().from(schema.knowledgeLinks).where(
              sql`(file_a_id = ${current.id} AND file_b_id = ${matchedFile.id}) OR (file_a_id = ${matchedFile.id} AND file_b_id = ${current.id})`
            );
            if (existing.length === 0) {
              await db.insert(schema.knowledgeLinks).values({
                userId,
                fileAId: current.id,
                fileBId: matchedFile.id,
                relationType: relType,
                description: desc,
              });
              console.log(`  Link: ${current.name} <-> ${matchedFile.name} (${relType}): ${desc}`);
            }
          }
        }
      } catch (err) {
        console.warn(`  Failed for ${current.name}:`, (err as Error).message);
      }
    }
  }

  console.log('Backfill complete');
  process.exit(0);
}

backfill();
