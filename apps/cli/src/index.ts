#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

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
  const baseUrl = process.env.AIDRIVE_API_URL || config.apiUrl || 'https://api.verrrnm.cloud';
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
  
  return res.json();
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
    const filePath = args[0];
    if (!filePath) { console.error('Usage: aidrive upload <file-path>'); break; }
    if (!existsSync(filePath)) { console.error(`File not found: ${filePath}`); break; }
    
    const config = loadConfig();
    const apiKey = process.env.AIDRIVE_API_KEY || config.apiKey;
    const baseUrl = process.env.AIDRIVE_API_URL || config.apiUrl || 'https://api.verrrnm.cloud';
    
    // Use FormData for multipart upload
    const fileContent = readFileSync(filePath);
    const fileName = filePath.split('/').pop() || 'file';
    
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
    formData.append('file', new Blob([fileContent], { type: mimeType }), fileName);
    
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

  case 'help':
  case undefined:
  default:
    console.log(`
🧠 AI Drive CLI — 你的 AI 知识操作系统

命令:
  aidrive config set-key <key>  设置 API Key
  aidrive config set-url <url>  设置 API URL（默认 https://api.verrrnm.cloud）
  aidrive config show           显示当前配置

  aidrive files [--brief]       列出知识库文件
  aidrive search <query>        语义搜索
  aidrive ask <question>        基于知识库问答
  aidrive insights              查看 AI 洞察
  aidrive timeline [--limit N]  知识活动时间线
  aidrive upload <file>         上传文件

示例:
  aidrive config set-key ak_xxxxxxxxxxxx
  aidrive search "去年的营收数据"
  aidrive ask "竞品分析的核心结论是什么"
  aidrive upload ./report.pdf
`);
    break;
}
