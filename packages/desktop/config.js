const fs = require('fs');
const path = require('path');
const os = require('os');

// 检测已安装的 AI 工具
async function detectTools() {
  const tools = [];
  const home = os.homedir();
  
  // Cursor
  const cursorPaths = {
    darwin: path.join(home, '.cursor'),
    win32: path.join(home, '.cursor'),
    linux: path.join(home, '.cursor'),
  };
  const cursorPath = cursorPaths[process.platform];
  if (cursorPath && fs.existsSync(cursorPath)) {
    tools.push({ name: 'Cursor', id: 'cursor', detected: true, configPath: path.join(cursorPath, 'mcp.json') });
  }
  
  // Claude Desktop
  const claudePaths = {
    darwin: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    win32: path.join(home, 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
  };
  const claudePath = claudePaths[process.platform];
  if (claudePath && fs.existsSync(claudePath)) {
    tools.push({ name: 'Claude Desktop', id: 'claude', detected: true, configPath: claudePath });
  }
  
  // Windsurf
  const windsurfPaths = {
    darwin: path.join(home, '.windsurf'),
    win32: path.join(home, '.windsurf'),
  };
  const windsurfPath = windsurfPaths[process.platform];
  if (windsurfPath && fs.existsSync(windsurfPath)) {
    tools.push({ name: 'Windsurf', id: 'windsurf', detected: true, configPath: path.join(windsurfPath, 'mcp.json') });
  }
  
  return tools;
}

// 配置工具（写入 MCP 配置 + 改 API Base URL）
async function configureTools(tools, port) {
  const results = [];
  for (const tool of tools) {
    if (!tool.detected) continue;
    try {
      if (tool.configPath) {
        let config = {};
        try { config = JSON.parse(fs.readFileSync(tool.configPath, 'utf8')); } catch {}
        if (!config.mcpServers) config.mcpServers = {};
        config.mcpServers.drivemem = {
          url: `http://localhost:${port}/mcp`
        };
        const dir = path.dirname(tool.configPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(tool.configPath, JSON.stringify(config, null, 2));
        results.push({ tool: tool.name, success: true });
      }
    } catch (err) {
      results.push({ tool: tool.name, success: false, error: err.message });
    }
  }
  return results;
}

module.exports = { detectTools, configureTools };
