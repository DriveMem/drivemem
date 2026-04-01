interface Props {
  content: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function processInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>');
}

function renderMarkdown(md: string): string {
  const blocks: string[] = [];
  const lines = md.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') { i++; continue; }

    // Code blocks
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      blocks.push(`<pre class="bg-gray-50 rounded-lg p-4 text-sm font-mono overflow-x-auto my-3"><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
      continue;
    }

    // Headings
    if (line.startsWith('#### ')) { blocks.push(`<h4 class="text-sm font-semibold text-primary mt-4 mb-2">${processInline(line.slice(5))}</h4>`); i++; continue; }
    if (line.startsWith('### ')) { blocks.push(`<h3 class="text-base font-semibold text-primary mt-5 mb-2">${processInline(line.slice(4))}</h3>`); i++; continue; }
    if (line.startsWith('## ')) { blocks.push(`<h2 class="text-lg font-semibold text-primary mt-6 mb-2">${processInline(line.slice(3))}</h2>`); i++; continue; }
    if (line.startsWith('# ')) { blocks.push(`<h1 class="text-xl font-bold text-primary mt-6 mb-3">${processInline(line.slice(2))}</h1>`); i++; continue; }

    // Lists - collect consecutive list items
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(`<li class="ml-4">${processInline(lines[i].slice(2))}</li>`);
        i++;
      }
      blocks.push(`<ul class="list-disc space-y-1 my-3 ml-2">${items.join('')}</ul>`);
      continue;
    }

    // Paragraph
    blocks.push(`<p class="my-2 leading-relaxed text-secondary">${processInline(line)}</p>`);
    i++;
  }

  return blocks.join('');
}

/** Memory 内容渲染器 — 将 Markdown 蒸馏记录渲染为 HTML */
export default function MemoryViewer({ content }: Props) {
  return (
    <div
      className="prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
