#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
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

function main() {
  const command = process.argv[2];

  if (command === 'setup') {
    // --print-url mode: just output MCP URL for any client
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
  } else {
    console.log('🧠 DriveMem CLI\n');
    console.log('Usage:');
    console.log('  npx drivemem setup                       Auto-configure Cursor, Claude Desktop, Windsurf');
    console.log('  npx drivemem setup --api-key=ak_xxx      Non-interactive mode');
    console.log('  npx drivemem setup --print-url --api-key=ak_xxx   Just print MCP URL');
    console.log('');
    console.log('More: https://drivemem.cloud/docs');
  }
}

main();
