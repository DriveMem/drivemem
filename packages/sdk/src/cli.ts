#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import http from 'node:http';
import { join } from 'path';
import { homedir } from 'os';
import * as readline from 'readline';

const RULES_CONTENT = `# DriveMem Integration Rules

You have access to DriveMem — the user's shared knowledge base across all AI tools.
You MUST use it proactively. These are not suggestions — they are mandatory behaviors.

## MANDATORY BEHAVIORS:

### 1. Load Context at Session Start
At the START of every conversation, call aidrive_compile_context with a description of the current task.
This gives you the user's background, recent work, and relevant knowledge BEFORE you respond.

### 2. Search Before Answering
Before answering ANY question, call aidrive_search to check the knowledge base.
The user expects you to already know their projects, decisions, and preferences.

### 3. Save Valuable Output
When the conversation produces decisions, conclusions, analysis, or action items,
call aidrive_store to save them. Other AI tools will automatically benefit.

## TRIGGER CONDITIONS (when to act):

| User says / situation | Action |
|---|---|
| "之前…/上次…/我们决定了…/previously/last time" | aidrive_search BEFORE answering |
| Conversation produces a clear decision or conclusion | aidrive_store with appropriate tags |
| Starting a new task or project | aidrive_search for related context |
| Completing a task milestone | aidrive_store summary + next steps |
| "记住这个/remember this/don't forget" | aidrive_store immediately |

## Why
The user connected you to DriveMem so every session builds on past knowledge.
Every conversation should start with context loading and end with knowledge saving.
`;

async function setup() {
  console.log('🧠 DriveMem Setup — Connecting your AI tools\n');

  // 1. Get API Key — support --api-key flag or env var for non-interactive use
  let apiKey = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1]
    || process.env.DRIVEMEM_API_KEY
    || '';

  if (!apiKey) {
    // Detect non-interactive terminal (piped stdin with no data)
    if (!process.stdin.isTTY) {
      console.error('❌ No API key provided. In non-interactive mode, use:');
      console.error('   npx drivemem setup --api-key=ak_xxx');
      console.error('   or: echo "ak_xxx" | npx drivemem setup');
      process.exit(1);
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    apiKey = await new Promise<string>(resolve => {
      rl.question('Enter your DriveMem API Key (from drivemem.cloud/settings): ', resolve);
    });
    rl.close();
  }

  if (!apiKey.startsWith('ak_')) {
    console.log('❌ Invalid API Key. Get yours at https://drivemem.cloud/settings');
    process.exit(1);
  }

  const mcpUrl = `https://api.drivemem.cloud/mcp?apiKey=${apiKey}`;
  let configured = 0;

  // 2. Configure Cursor
  const cursorDir = join(homedir(), '.cursor');
  const cursorConfig = join(cursorDir, 'mcp.json');
  console.log('\n📝 Configuring Cursor...');
  try {
    mkdirSync(cursorDir, { recursive: true });
    let config: Record<string, unknown> = {};
    if (existsSync(cursorConfig)) {
      config = JSON.parse(readFileSync(cursorConfig, 'utf-8'));
    }
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    (config.mcpServers as Record<string, unknown>).drivemem = { url: mcpUrl };
    writeFileSync(cursorConfig, JSON.stringify(config, null, 2));
    console.log('  ✅ Cursor configured — restart Cursor to connect');
    configured++;
  } catch (e) {
    console.log('  ⚠️ Could not configure Cursor:', (e as Error).message);
  }

  // 3. Configure Claude Desktop
  const platform = process.platform;
  const claudeConfigPath = platform === 'darwin'
    ? join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    : platform === 'win32'
    ? join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
    : join(homedir(), '.config', 'claude', 'claude_desktop_config.json');

  console.log('\n📝 Configuring Claude Desktop...');
  try {
    const claudeDir = join(claudeConfigPath, '..');
    mkdirSync(claudeDir, { recursive: true });
    let config: Record<string, unknown> = {};
    if (existsSync(claudeConfigPath)) {
      config = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));
    }
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    (config.mcpServers as Record<string, unknown>).drivemem = { url: mcpUrl };
    writeFileSync(claudeConfigPath, JSON.stringify(config, null, 2));
    console.log('  ✅ Claude Desktop configured — restart Claude to connect');
    configured++;
  } catch (e) {
    console.log('  ⚠️ Could not configure Claude Desktop:', (e as Error).message);
  }

  // 4. Configure Windsurf
  const windsurfDir = join(homedir(), '.windsurf');
  const windsurfConfig = join(windsurfDir, 'mcp.json');
  console.log('\n📝 Configuring Windsurf...');
  try {
    mkdirSync(windsurfDir, { recursive: true });
    let config: Record<string, unknown> = {};
    if (existsSync(windsurfConfig)) {
      config = JSON.parse(readFileSync(windsurfConfig, 'utf-8'));
    }
    if (!config.mcpServers || typeof config.mcpServers !== 'object') config.mcpServers = {};
    (config.mcpServers as Record<string, unknown>).drivemem = { url: mcpUrl };
    writeFileSync(windsurfConfig, JSON.stringify(config, null, 2));
    console.log('  ✅ Windsurf configured — restart Windsurf to connect');
    configured++;
  } catch (e) {
    console.log('  ⚠️ Could not configure Windsurf:', (e as Error).message);
  }

  // 5. Add .cursorrules to current project
  const cursorrules = join(process.cwd(), '.cursorrules');
  if (!existsSync(cursorrules)) {
    console.log('\n📝 Adding .cursorrules to current project...');
    writeFileSync(cursorrules, RULES_CONTENT);
    console.log('  ✅ .cursorrules added to project');
  }

  // 6. Add CLAUDE.md for Claude Code users
  const claudeMd = join(process.cwd(), 'CLAUDE.md');
  if (!existsSync(claudeMd)) {
    console.log('\n📝 Adding CLAUDE.md for Claude Code...');
    writeFileSync(claudeMd, RULES_CONTENT);
    console.log('  ✅ CLAUDE.md added to project');
  }

  // 6. Summary
  console.log('\n' + '='.repeat(50));
  console.log(`🎉 DriveMem connected to ${configured} tool(s)!`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Restart your AI tools (Cursor, Claude Desktop, Windsurf)');
  console.log('  2. Start a new conversation');
  console.log('  3. Your agent now has access to your knowledge base!');
  console.log('');
  console.log('Dashboard: https://drivemem.cloud');
  console.log('='.repeat(50));
}

async function startProxy(driveMemApiKey: string, port: number, defaultUpstreamUrl: string = '', contextBudget: number = 500) {
  console.log('🧠 DriveMem Proxy starting...\n');

  const DRIVEMEM_API = 'https://api.drivemem.cloud';
  let contextCount = 0;
  let harvestCount = 0;

  const server = http.createServer(async (req, res) => {
    // CORS headers for local dev tools
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-LLM-Base-URL');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === 'POST' && req.url?.startsWith('/v1/chat/completions')) {
      let body = '';
      req.on('data', (chunk: Buffer) => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);
          const messages: Array<{ role: string; content: string }> = data.messages || [];
          const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
          const query = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content : '';

          // 1. Search DriveMem for context (smart injection)
          let contextSnippet = '';
          const trivialPatterns = /^(hi|hello|hey|thanks|thank you|ok|yes|no|sure|bye|good|great|什么|你好|谢谢)\b/i;
          const needsContext = query && query.length > 10 && !trivialPatterns.test(query.trim());
          
          if (needsContext) {
            try {
              const searchRes = await fetch(`${DRIVEMEM_API}/api/v1/search?q=${encodeURIComponent(query)}&limit=5`, {
                headers: { 'Authorization': `Bearer ${driveMemApiKey}` }
              });
              if (searchRes.ok) {
                const searchData = await searchRes.json() as { results?: Array<{ fileName?: string; text?: string; score?: number }> };
                // Score threshold 0.5 — only truly relevant results
                const relevant = (searchData.results || []).filter((r: any) => (r.score || 0) > 0.5);
                
                if (relevant.length > 0) {
                  // Token budget mode: ~500 tokens ≈ 2000 chars, greedy fill by score
                  const TOKEN_BUDGET_CHARS = contextBudget * 4; // ~4 chars per token
                  let usedChars = 0;
                  const snippets: string[] = [];
                  
                  for (const r of relevant) {
                    const text = r.text || '';
                    const remaining = TOKEN_BUDGET_CHARS - usedChars;
                    if (remaining <= 50) break; // not enough room
                    const snippet = `[${snippets.length + 1}] ${r.fileName}: ${text.slice(0, remaining)}`;
                    snippets.push(snippet);
                    usedChars += snippet.length;
                  }
                  
                  if (snippets.length > 0) {
                    contextSnippet = snippets.join('\n\n');
                    contextCount++;
                    console.log(`  ✅ Injected context for "${query.slice(0, 40)}..." (${snippets.length} sources, ~${Math.round(usedChars / 4)} tokens)`);
                  }
                }
              }
            } catch { /* ignore search errors */ }
          }

          // 2. Inject context into messages
          const injectedMessages = [...messages];
          if (contextSnippet) {
            const contextMsg = {
              role: 'system',
              content: `[DriveMem Context] Relevant knowledge from the user's knowledge base:\n\n${contextSnippet}\n\nUse this when relevant. Cite sources.`
            };
            const lastSystemIdx = injectedMessages.reduce((acc: number, m: { role: string }, i: number) => m.role === 'system' ? i : acc, -1);
            injectedMessages.splice(lastSystemIdx + 1, 0, contextMsg);
          }

          // 3. Get user's LLM endpoint
          const authHeader = req.headers['authorization'] || '';
          const llmBaseUrl = (defaultUpstreamUrl || (req.headers['x-llm-base-url'] as string) || 'https://api.openai.com').replace(/\/$/, '');
          // Smart path join: if upstream already ends with /v1, only append /chat/completions
          const targetUrl = llmBaseUrl.endsWith('/v1')
            ? `${llmBaseUrl}/chat/completions`
            : `${llmBaseUrl}/v1/chat/completions`;
          console.log(`  → Forwarding to: ${targetUrl}`);

          // 4. Forward to LLM
          const forwardBody = JSON.stringify({ ...data, messages: injectedMessages });
          const llmRes = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authHeader },
            body: forwardBody,
          });

          // 5. Stream or return response
          const isStream = data.stream === true;

          if (isStream && llmRes.body) {
            res.writeHead(llmRes.status, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            });

            const reader = (llmRes.body as ReadableStream<Uint8Array>).getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              res.write(chunk);

              const lines = chunk.split('\n').filter((l: string) => l.startsWith('data: ') && !l.includes('[DONE]'));
              for (const line of lines) {
                try {
                  const d = JSON.parse(line.slice(6));
                  fullResponse += d.choices?.[0]?.delta?.content || '';
                } catch { /* ignore */ }
              }
            }
            res.end();

            // 6. Async harvest
            if (fullResponse.length > 100) {
              harvestCount++;
              console.log(`  ✅ Harvested conclusions (${fullResponse.length} chars)`);
              fetch(`${DRIVEMEM_API}/api/v1/store`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${driveMemApiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: `Q: ${query.slice(0, 200)}\n\nA: ${fullResponse.slice(0, 2000)}`, title: query.slice(0, 60), tags: ['proxy-captured'], source: 'proxy' })
              }).catch(() => {});
            }
          } else {
            const responseData = await llmRes.text();
            res.writeHead(llmRes.status, { 'Content-Type': 'application/json' });
            res.end(responseData);

            try {
              const parsed = JSON.parse(responseData);
              const content = parsed.choices?.[0]?.message?.content || '';
              if (content.length > 100) {
                harvestCount++;
                fetch(`${DRIVEMEM_API}/api/v1/store`, {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${driveMemApiKey}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ content: `Q: ${query.slice(0, 200)}\n\nA: ${content.slice(0, 2000)}`, title: query.slice(0, 60), tags: ['proxy-captured'], source: 'proxy' })
                }).catch(() => {});
              }
            } catch { /* ignore */ }
          }
        } catch (err: unknown) {
          console.error('  ❌ Proxy error:', (err as Error).message);
          res.writeHead(502);
          res.end(JSON.stringify({ error: { message: 'Proxy error', type: 'proxy_error' } }));
        }
      });
    } else if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', contextInjections: contextCount, harvests: harvestCount }));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Only /v1/chat/completions is proxied' }));
    }
  });

  server.listen(port, () => {
    console.log(`🧠 DriveMem Proxy running on http://localhost:${port}`);
    console.log(`→ Upstream LLM: ${defaultUpstreamUrl || 'https://api.openai.com (default)'}`);
    console.log(`→ Context budget: ${contextBudget} tokens per request`);
    console.log(`→ Set your AI tool's API Base URL to: http://localhost:${port}/v1`);
    console.log(`→ Your LLM API keys stay local. Only knowledge queries go to DriveMem cloud.`);
    console.log(`→ Health check: http://localhost:${port}/health`);
    console.log(`→ Press Ctrl+C to stop.\n`);
  });
}

function main() {
  const command = process.argv[2];

  if (command === 'setup') {
    const printUrl = process.argv.includes('--print-url');
    if (printUrl) {
      const apiKey = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1]
        || process.env.DRIVEMEM_API_KEY;
      if (!apiKey) {
        console.error('Usage: npx drivemem setup --print-url --api-key=ak_xxx');
        process.exit(1);
      }
      console.log(`https://api.drivemem.cloud/mcp?apiKey=${apiKey}`);
      return;
    }
    setup().catch(console.error);
  } else if (command === 'proxy') {
    // Daemon mode
    if (process.argv.includes('--daemon')) {
      import('node:child_process').then(({ spawn }) => {
        const args = process.argv.slice(2).filter(a => a !== '--daemon');
        const child = spawn(process.execPath, [process.argv[1], ...args], {
          detached: true,
          stdio: 'ignore',
        });
        child.unref();
        console.log(`🧠 DriveMem Proxy daemon started (PID: ${child.pid})`);
        console.log(`→ Stop with: kill ${child.pid}`);
        process.exit(0);
      });
      return;
    }

    const apiKey = process.argv.find(a => a.startsWith('--api-key='))?.split('=')[1] || process.env.DRIVEMEM_API_KEY;
    const port = parseInt(process.argv.find(a => a.startsWith('--port='))?.split('=')[1] || '7879');
    const upstreamUrl = process.argv.find(a => a.startsWith('--upstream-url='))?.split('=')[1] || process.env.LLM_BASE_URL || '';
    const contextBudgetArg = parseInt(process.argv.find(a => a.startsWith('--context-budget='))?.split('=')[1] || '500');

    if (!apiKey) {
      console.error('❌ DriveMem API Key required. Use --api-key=ak_xxx or set DRIVEMEM_API_KEY env var');
      process.exit(1);
    }

    startProxy(apiKey, port, upstreamUrl, contextBudgetArg).catch(console.error);
  } else {
    console.log('🧠 DriveMem CLI\n');
    console.log('Usage:');
    console.log('  npx drivemem setup                              Auto-configure MCP for Cursor/Claude/Windsurf');
    console.log('  npx drivemem setup --api-key=ak_xxx             Non-interactive mode');
    console.log('  npx drivemem setup --print-url --api-key=ak_xxx Just print MCP URL');
    console.log('  npx drivemem proxy --api-key=ak_xxx             Start local LLM proxy (recommended)');
    console.log('  npx drivemem proxy --daemon --api-key=ak_xxx    Start as background process');
    console.log('');
    console.log('More: https://drivemem.cloud/docs');
  }
}

main();
