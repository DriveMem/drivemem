/**
 * #136 — Backfill: strip AI meta-language prefixes from historical file summaries
 * 
 * Reuses the same cleanSummary logic from apps/web/src/lib/text-utils.ts
 * Run: cd ~/repos/ai-drive && npx tsx scripts/backfill-clean-summaries.ts
 */

import postgres from 'postgres';
import 'dotenv/config';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://aidrive:aidrive@localhost:5432/aidrive';

function cleanSummary(text: string): string {
  return text
    .replace(/^(This (document|file|note|page|article|entry|memo|record|piece) (is about|describes|details|outlines|summarizes|covers|contains|provides|presents|discusses|explains|records|captures|announces|is a)[^.]*?\.\s*)/i, '')
    .replace(/^(Based on the provided (document|content|text|file)[^.]*?\.\s*)/i, '')
    .replace(/^(Based on (the |your )?(provided |uploaded )?(document|content|text|file)[^.]*?\.\s*)/i, '')
    .replace(/^(Here is|The following|Below is)[^.]*?\.\s*/i, '')
    .replace(/^(Summary:?\s*)/i, '')
    .trim();
}

async function main() {
  const sql = postgres(DATABASE_URL);
  
  // Find all files with summaries that match AI prefix patterns
  const rows = await sql`
    SELECT id, summary FROM files 
    WHERE summary IS NOT NULL 
      AND summary != ''
      AND (
        summary ~* '^(This (document|file|note|page|article|entry|memo|record|piece) (is about|describes|details|outlines|summarizes|covers|contains|provides|presents|discusses|explains|records|captures|announces|is a))'
        OR summary ~* '^(Based on (the |your )?(provided |uploaded )?(document|content|text|file))'
        OR summary ~* '^(Here is|The following|Below is)'
        OR summary ~* '^Summary:?\\s'
      )
  `;

  console.log(`Found ${rows.length} files with AI prefix in summary`);

  let updated = 0;
  for (const row of rows) {
    const cleaned = cleanSummary(row.summary);
    if (cleaned !== row.summary && cleaned.length > 0) {
      await sql`UPDATE files SET summary = ${cleaned}, updated_at = NOW() WHERE id = ${row.id}`;
      updated++;
      console.log(`  ✅ ${row.id}: "${row.summary.substring(0, 60)}..." → "${cleaned.substring(0, 60)}..."`);
    }
  }

  console.log(`\nDone: ${updated}/${rows.length} summaries cleaned`);
  await sql.end();
}

main().catch(e => { console.error(e); process.exit(1); });
