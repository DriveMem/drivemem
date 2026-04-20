#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import * as readline from 'readline';

async function setup() {
  console.log('🧠 DriveMem Setup — Connecting your AI tools\n');

  // 1. Get API Key
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const apiKey = await new Promise<string>(resolve => {
    rl.question('Enter your DriveMem API Key (from drivemem.cloud/settings): ', resolve);
  });
  rl.close();

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
    const rules = `# DriveMem Integration Rules

You have access to DriveMem — the user's shared knowledge base. USE IT PROACTIVELY.

## MANDATORY BEHAVIORS:

### Before answering any question:
- Call aidrive_search with relevant keywords to check the knowledge base
- Use the results to inform your answer

### At the start of every conversation:
- Call aidrive_compile_context with a description of the current task

### After producing valuable output:
- Call aidrive_store to save decisions, conclusions, and action items
`;
    writeFileSync(cursorrules, rules);
    console.log('  ✅ .cursorrules added to project');
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
    setup().catch(console.error);
  } else {
    console.log('🧠 DriveMem CLI\n');
    console.log('Usage:');
    console.log('  npx drivemem setup    Auto-configure Cursor, Claude Desktop & Windsurf');
    console.log('');
    console.log('More: https://drivemem.cloud/docs');
  }
}

main();
