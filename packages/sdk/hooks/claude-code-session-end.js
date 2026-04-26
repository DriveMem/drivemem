#!/usr/bin/env node
// DriveMem Claude Code SessionEnd Hook
// Automatically harvests session knowledge to DriveMem

const API_BASE = 'https://api.drivemem.cloud';

async function main() {
  // Read stdin (Claude Code sends JSON payload)
  let input = '';
  for await (const chunk of process.stdin) input += chunk;

  const payload = JSON.parse(input);
  const { session_id, transcript_path, cwd } = payload;

  // Get API key from env or config
  const apiKey = process.env.DRIVEMEM_API_KEY || await readApiKeyFromConfig();
  if (!apiKey) {
    process.stderr.write('[drivemem] No API key found. Set DRIVEMEM_API_KEY or run npx drivemem setup.\n');
    process.exit(0); // Don't block Claude Code
  }

  // Read transcript if available
  let transcript = '';
  if (transcript_path) {
    try {
      const fs = require('fs');
      transcript = fs.readFileSync(transcript_path, 'utf-8').slice(-10000); // Last 10K chars
    } catch {}
  }

  if (!transcript) {
    process.exit(0); // Nothing to harvest
  }

  // Call DriveMem store API
  try {
    const res = await fetch(`${API_BASE}/api/v1/store`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        content: `[Claude Code Session]\nProject: ${cwd}\nSession: ${session_id}\n\n${transcript}`,
        title: `Claude Code session — ${require('path').basename(cwd || '')}`,
        tags: 'claude-code,auto-capture',
      }),
    });

    if (res.ok) {
      process.stderr.write(`[drivemem] Session knowledge saved ✅\n`);
    }
  } catch (err) {
    process.stderr.write(`[drivemem] Harvest failed (non-blocking): ${err.message}\n`);
  }

  process.exit(0);
}

async function readApiKeyFromConfig() {
  try {
    const fs = require('fs');
    const path = require('path');
    // Check Cursor config
    const cursorConfig = path.join(require('os').homedir(), '.cursor', 'mcp.json');
    if (fs.existsSync(cursorConfig)) {
      const config = JSON.parse(fs.readFileSync(cursorConfig, 'utf-8'));
      const url = config?.mcpServers?.drivemem?.url || '';
      const match = url.match(/apiKey=([^&]+)/);
      if (match) return match[1];
    }
    // Check Claude Desktop config
    const platform = process.platform;
    const claudeConfig = platform === 'darwin'
      ? path.join(require('os').homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      : platform === 'win32'
      ? path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json')
      : path.join(require('os').homedir(), '.config', 'claude', 'claude_desktop_config.json');
    if (fs.existsSync(claudeConfig)) {
      const config = JSON.parse(fs.readFileSync(claudeConfig, 'utf-8'));
      const args = config?.mcpServers?.drivemem?.args || [];
      const keyArg = args.find(a => a.startsWith('--api-key='));
      if (keyArg) return keyArg.split('=')[1];
    }
  } catch {}
  return null;
}

main().catch(() => process.exit(0));
