#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { createInterface } from 'readline';

const CONFIG_DIR = join(homedir(), '.aidrive');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

interface Config {
  apiKey?: string;
  apiUrl?: string;
}

function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) return {};
  return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
}

function saveConfig(config: Config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function apiCall(path: string, options: RequestInit = {}) {
  const config = loadConfig();
  const apiKey = process.env.AIDRIVE_API_KEY || config.apiKey;
  if (!apiKey) {
    console.error('Error: No API key. Set AIDRIVE_API_KEY env var or run: aidrive config set-key <key>');
    process.exit(1);
  }
  const baseUrl = process.env.AIDRIVE_API_URL || config.apiUrl || 'https://api.drivemem.cloud';
  const url = `${baseUrl}/api/v1${path}`;
  
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error(`Error ${res.status}: ${err}`);
    process.exit(1);
  }
  
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return {};
  }
  
  const text = await res.text();
  if (!text) return {};
  return JSON.parse(text);
}

const [,, command, ...rawArgs] = process.argv;
const jsonMode = rawArgs.includes('--json');
const args = rawArgs.filter(a => a !== '--json');

function output(data: unknown, humanText: string) {
  if (jsonMode) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(humanText);
  }
}

switch (command) {
  case 'config': {
    const subCmd = args[0];
    if (subCmd === 'set-key') {
      const key = args[1];
      if (!key) { console.error('Usage: aidrive config set-key <api-key>'); break; }
      const config = loadConfig();
      config.apiKey = key;
      saveConfig(config);
      console.log('✅ API key saved to ~/.aidrive/config.json');
    } else if (subCmd === 'set-url') {
      const url = args[1];
      if (!url) { console.error('Usage: aidrive config set-url <api-url>'); break; }
      const config = loadConfig();
      config.apiUrl = url;
      saveConfig(config);
      console.log(`✅ API URL set to ${url}`);
    } else if (subCmd === 'show') {
      const config = loadConfig();
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('Usage: aidrive config <set-key|set-url|show>');
    }
    break;
  }

  case 'files':
  case 'ls': {
    const detail = args.includes('--brief') ? 'brief' : 'full';
    const data = await apiCall(`/files?detail=${detail}`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    if (data.files?.length === 0) {
      console.log('📂 知识库为空');
    } else {
      for (const f of data.files) {
        console.log(`📄 ${f.name} (${f.status}) ${f.summary ? '— ' + f.summary.slice(0, 60) : ''}`);
      }
      console.log(`\n共 ${data.files.length} 个文件`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); }
    }
    break;
  }

  case 'search': {
    const formatFlag = args.includes('--summary') ? 'summary' : '';
    const queryArgs = args.filter(a => a !== '--summary');
    const query = queryArgs.join(' ');
    if (!query) { console.error('Usage: aidrive search <query> [--summary] [--json]'); break; }
    const formatParam = formatFlag ? `&format=${formatFlag}` : '';
    const data = await apiCall(`/search?q=${encodeURIComponent(query)}${formatParam}`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    if (data.results?.length === 0) {
      console.log('🔍 未找到相关内容');
    } else {
      for (const r of data.results) {
        console.log(`\n🔍 [${r.fileName}] (score: ${r.score.toFixed(2)})`);
        console.log(`   ${r.text.slice(0, 200)}`);
      }
    }
    break;
  }

  case 'ask': {
    const budgetIdx = args.indexOf('--budget');
    const budgetVal = budgetIdx > -1 ? parseInt(args[budgetIdx + 1]) : undefined;
    const askSummary = args.includes('--summary');
    const askArgs = args.filter((a, i) => a !== '--budget' && a !== '--summary' && (budgetIdx === -1 || i !== budgetIdx + 1));
    const question = askArgs.join(' ');
    if (!question) { console.error('Usage: aidrive ask <question> [--budget N] [--summary] [--json]'); break; }
    if (!jsonMode) console.log('🤔 AI 正在思考...');
    const askBody: Record<string, unknown> = { question };
    if (budgetVal) askBody.contextBudget = budgetVal;
    if (askSummary) askBody.preferFormat = 'summary';
    const data = await apiCall('/ask', {
      method: 'POST',
      body: JSON.stringify(askBody),
    });
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    console.log(`\n💡 ${data.answer}`);
    if (data.sources?.length > 0) {
      console.log('\n📎 来源:');
      for (const s of data.sources) {
        console.log(`   - ${s.fileName} (score: ${s.score.toFixed(2)})`);
      }
    }
    break;
  }

  case 'insights': {
    const data = await apiCall('/insights');
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    if (data.insights?.length === 0) {
      console.log('💡 暂无 AI 洞察');
    } else {
      for (const i of data.insights) {
        console.log(`💡 ${i.title}`);
        console.log(`   ${i.sourceFileName} ↔ ${i.relatedFileName}`);
        console.log(`   ${i.description}\n`);
      }
    }
    break;
  }

  case 'timeline': {
    const limitArg = args.includes('--limit') ? args[args.indexOf('--limit') + 1] : '20';
    const data = await apiCall(`/timeline?limit=${limitArg}`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    if (!data.events?.length) {
      console.log('📅 暂无活动记录');
    } else {
      for (const e of data.events) {
        const date = new Date(e.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        const desc = e.description ? ` — ${e.description.slice(0, 60)}` : '';
        console.log(`${e.icon} [${date}] ${e.title}${desc}`);
      }
      console.log(`\n共 ${data.total} 条活动`);
    }
    break;
  }

  case 'upload': {
    const nameIdx = args.indexOf('--name');
    const nameVal = nameIdx > -1 ? args[nameIdx + 1] : undefined;
    const uploadArgs = args.filter((a, i) => a !== '--name' && (nameIdx === -1 || i !== nameIdx + 1));
    const filePath = uploadArgs[0];
    
    let fileContent: Buffer;
    let fileName: string;
    
    if (!filePath && !process.stdin.isTTY) {
      // Pipe mode: cat file.md | aidrive upload --name notes.md
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      fileContent = Buffer.concat(chunks);
      fileName = nameVal || `upload-${new Date().toISOString().slice(0, 10)}.md`;
    } else if (filePath) {
      if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); break; }
      fileContent = readFileSync(filePath) as Buffer;
      fileName = nameVal || filePath.split('/').pop() || 'file';
    } else {
      console.error('Usage: aidrive upload <file-path> [--json]');
      console.error('  or: cat notes.md | aidrive upload --name notes.md');
      break;
    }
    
    // Detect MIME type from extension
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeMap: Record<string, string> = {
      'md': 'text/markdown', 'txt': 'text/plain', 'pdf': 'application/pdf',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'json': 'application/json', 'csv': 'text/csv', 'html': 'text/html',
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';
    
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(fileContent)], { type: mimeType }), fileName);
    
    const config = loadConfig();
    const apiKey = process.env.AIDRIVE_API_KEY || config.apiKey;
    const baseUrl = process.env.AIDRIVE_API_URL || config.apiUrl || 'https://api.drivemem.cloud';
    
    const res = await fetch(`${baseUrl}/api/v1/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: formData,
    });
    
    if (!res.ok) {
      console.error(`Upload failed: ${res.status} ${await res.text()}`);
      break;
    }
    
    const data = await res.json();
    console.log(`✅ 已上传: ${fileName} (${data.fileId})`);
    console.log('   AI 正在解析和索引...');
    break;
  }

  case 'store': {
    // Support pipe: echo "note" | aidrive store
    let content: string;
    if (args.length > 0) {
      content = args.join(' ');
    } else if (!process.stdin.isTTY) {
      // Read from stdin pipe
      content = await new Promise<string>((resolve) => {
        let data = '';
        process.stdin.setEncoding('utf-8');
        process.stdin.on('data', (chunk) => { data += chunk; });
        process.stdin.on('end', () => { resolve(data.trim()); });
      });
    } else {
      console.error('Usage: aidrive store <text> [--title <t>] [--tags <t1,t2>] [--json]');
      console.error('  or: echo "note" | aidrive store');
      break;
    }
    if (!content) { console.error('Error: empty content'); break; }
    const titleIdx = args.indexOf('--title');
    const tagsIdx = args.indexOf('--tags');
    const storeBody: Record<string, string> = { content };
    if (titleIdx > -1 && args[titleIdx + 1]) storeBody.title = args[titleIdx + 1];
    if (tagsIdx > -1 && args[tagsIdx + 1]) storeBody.tags = args[tagsIdx + 1];
    const data = await apiCall('/store', { method: 'POST', body: JSON.stringify(storeBody) });
    output(data, `✅ 已存入: ${data.name || data.fileName || 'note'} (${data.id || data.fileId})`);
    break;
  }

  case 'info': {
    const fileId = args[0];
    if (!fileId) { console.error('Usage: aidrive info <file-id> [--json]'); break; }
    const data = await apiCall(`/files/${fileId}`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    const f = data.file || data;
    console.log(`📄 ${f.name || f.originalName}`);
    console.log(`   ID: ${f.id}`);
    console.log(`   类型: ${f.mimeType || '未知'}`);
    console.log(`   大小: ${f.size ? (f.size / 1024).toFixed(1) + ' KB' : '未知'}`);
    console.log(`   状态: ${f.status || '未知'}`);
    if (f.summary) console.log(`\n📝 AI 摘要:\n   ${f.summary}`);
    if (f.createdAt) console.log(`\n   创建: ${new Date(f.createdAt).toLocaleString('zh-CN')}`);
    if (f.updatedAt) console.log(`   更新: ${new Date(f.updatedAt).toLocaleString('zh-CN')}`);
    break;
  }

  case 'delete':
  case 'rm': {
    const fileId = args[0];
    if (!fileId) { console.error('Usage: aidrive delete <file-id> [--force] [--json]'); break; }
    if (!args.includes('--force') && process.stdin.isTTY) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>((resolve) => {
        rl.question(`确认删除文件 ${fileId}? (y/N) `, resolve);
      });
      rl.close();
      if (answer.toLowerCase() !== 'y') { console.log('取消删除'); break; }
    }
    await apiCall(`/files/${fileId}`, { method: 'DELETE' });
    output({ deleted: fileId }, `🗑️ 已删除: ${fileId}`);
    break;
  }

  case 'login': {
    if (args[0] === '--key' && args[1]) {
      const config = loadConfig();
      config.apiKey = args[1];
      saveConfig(config);
      console.log('✅ API key saved to ~/.aidrive/config.json');
    } else {
      console.log('🔑 获取 API Key:');
      console.log('   1. 打开 https://drivemem.cloud/settings?tab=developer');
      console.log('   2. 点击"创建 Key"');
      console.log('   3. 复制 Key，然后运行:');
      console.log('');
      console.log('   aidrive login --key <your-api-key>');
      console.log('');
      console.log('   或设置环境变量: export AIDRIVE_API_KEY=ak_xxx');
    }
    break;
  }

  case 'rename': {
    const fileId = args[0];
    const newName = args[1];
    if (!fileId || !newName) { console.error('Usage: aidrive rename <file-id> <new-name>'); break; }
    const data = await apiCall(`/files/${fileId}`, { method: 'PATCH', body: JSON.stringify({ name: newName }) });
    output(data, `✅ 已重命名为: ${newName}`);
    break;
  }

  case 'archive': {
    if (args.length === 0) { console.error('Usage: aidrive archive <file-id> [file-id...]'); break; }
    const data = await apiCall('/files/batch', { method: 'POST', body: JSON.stringify({ action: 'archive', fileIds: args }) });
    output(data, `✅ 已归档 ${data.success?.length || 0} 个文件${data.failed?.length ? `，失败 ${data.failed.length} 个` : ''}`);
    break;
  }

  case 'unarchive': {
    if (args.length === 0) { console.error('Usage: aidrive unarchive <file-id> [file-id...]'); break; }
    const data = await apiCall('/files/batch', { method: 'POST', body: JSON.stringify({ action: 'unarchive', fileIds: args }) });
    output(data, `✅ 已取消归档 ${data.success?.length || 0} 个文件${data.failed?.length ? `，失败 ${data.failed.length} 个` : ''}`);
    break;
  }

  case 'pack': {
    const folderId = args[0];
    if (!folderId) { console.error('Usage: aidrive pack <folder-id> [--json]'); break; }
    const format = jsonMode ? 'json' : 'markdown';
    if (!jsonMode) console.log('📦 正在生成交接包...');
    const data = await apiCall(`/context-packet?folderId=${encodeURIComponent(folderId)}&format=${format}`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); }
    else { console.log(data.packet || data.content || JSON.stringify(data)); }
    break;
  }

  case 'help':
  case undefined:
  default:
    console.log(`
🧠 AI Drive CLI — 你的 AI 知识操作系统

认证:
  aidrive login --key <key>     设置 API Key
  aidrive config set-key <key>  设置 API Key（同 login --key）
  aidrive config set-url <url>  设置 API URL（默认 https://api.drivemem.cloud）
  aidrive config show           显示当前配置

知识操作:
  aidrive upload <file>         上传文件到知识库
  aidrive store <text>          快速存入一段知识
  aidrive search <query>        语义搜索知识库
  aidrive ask <question>        基于知识库 AI 问答

文件管理:
  aidrive files [--brief]       列出知识库文件
  aidrive info <file-id>        查看文件详情和 AI 摘要
  aidrive rename <id> <name>    重命名文件
  aidrive archive <id> [id...]  归档文件（支持批量）
  aidrive unarchive <id> [id...] 取消归档（支持批量）
  aidrive delete <file-id>      删除文件（需确认，--force 跳过）

AI 能力:
  aidrive insights              查看 AI 发现的知识关联
  aidrive timeline [--limit N]  知识活动时间线
  aidrive pack <folder-id>      生成项目交接包（跨模型任务接力）

全局选项:
  --json                        输出 JSON 格式（适合 agent/脚本）

示例:
  aidrive login --key ak_xxxxxxxxxxxx
  aidrive search "去年的营收数据"
  aidrive ask "竞品分析的核心结论是什么"
  aidrive store "今天决定使用 PostgreSQL" --title "技术决策"
  echo "meeting notes" | aidrive store --title "会议记录"
  aidrive upload ./report.pdf
  aidrive info abc-123-def
`);
    break;
}
