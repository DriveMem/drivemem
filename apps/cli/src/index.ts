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

  case 'init': {
    const name = args.join(' ');
    if (!name) { console.error('Usage: aidrive init <project-name>'); break; }
    const data = await apiCall('/folders', { method: 'POST', body: JSON.stringify({ name }) });
    output(data, `📁 项目「${name}」已创建 (ID: ${data.id})`);
    break;
  }

  case 'recall': {
    const query = args.join(' ');
    if (!query) { console.error('Usage: aidrive recall <query>'); break; }
    const data = await apiCall(`/search?q=${encodeURIComponent(query)}`);
    if (jsonMode) { console.log(JSON.stringify(data, null, 2)); break; }
    if (data.results?.length === 0) {
      console.log('🔍 未找到相关记忆');
    } else {
      for (const r of data.results) {
        console.log(`\n🧠 [${r.fileName}] (score: ${r.score.toFixed(2)})`);
        console.log(`   ${r.text.slice(0, 200)}`);
      }
    }
    break;
  }

  case 'commit': {
    const content = args.filter(a => !a.startsWith('--')).join(' ');
    if (!content) { console.error('Usage: aidrive commit "<content>" [--title <t>] [--tags <t1,t2>]'); break; }
    const titleIdx = args.indexOf('--title');
    const tagsIdx = args.indexOf('--tags');
    const storeBody: Record<string, string> = { content };
    if (titleIdx > -1 && args[titleIdx + 1]) storeBody.title = args[titleIdx + 1];
    if (tagsIdx > -1 && args[tagsIdx + 1]) storeBody.tags = args[tagsIdx + 1];
    const data = await apiCall('/store', { method: 'POST', body: JSON.stringify(storeBody) });
    output(data, `✅ 已存入: ${data.name || data.fileName || 'note'} (${data.id || data.fileId})`);
    break;
  }

  case 'handoff': {
    const subCmd = args[0];
    if (subCmd === 'send') {
      const toIdx = args.indexOf('--to');
      const wsIdx = args.indexOf('--workspace');
      const taskIdx = args.indexOf('--task');
      const nsIdx = args.indexOf('--next-steps');
      const kfIdx = args.indexOf('--key-facts');
      const notesIdx = args.indexOf('--notes');
      const toEmail = toIdx > -1 ? args[toIdx + 1] : undefined;
      const workspaceId = wsIdx > -1 ? args[wsIdx + 1] : undefined;
      const task = taskIdx > -1 ? args[taskIdx + 1] : undefined;
      const nextSteps = nsIdx > -1 ? args[nsIdx + 1]?.split(',').map(s => s.trim()) : undefined;
      const keyFacts = kfIdx > -1 ? args[kfIdx + 1]?.split(',').map(s => s.trim()) : undefined;
      const notes = notesIdx > -1 ? args[notesIdx + 1] : undefined;
      if (!toEmail || !workspaceId || !task || !nextSteps) {
        console.error('Usage: aidrive handoff send --to <email> --workspace <id> --task "..." --next-steps "step1,step2" [--key-facts "f1,f2"] [--notes "..."]');
        break;
      }
      // Step 1: lookup user by email
      const userData = await apiCall(`/users/lookup?email=${encodeURIComponent(toEmail)}`);
      const toUserId = userData.id || userData.userId;
      if (!toUserId) { console.error(`Error: User with email "${toEmail}" not found.`); break; }
      // Step 2: create handoff
      const contextPack: Record<string, unknown> = { task, next_steps: nextSteps };
      if (keyFacts) contextPack.key_facts = keyFacts;
      if (notes) contextPack.notes = notes;
      const createBody = { workspace_id: workspaceId, to_user_id: toUserId, context_pack: contextPack };
      const created = await apiCall('/handoffs', { method: 'POST', body: JSON.stringify(createBody) });
      // Step 3: send
      const data = await apiCall(`/handoffs/${created.id}/send`, { method: 'POST' });
      output(data, `✅ Handoff sent! ID: ${data.id || created.id}\n   To: ${toEmail}\n   Task: ${task}`);
    } else if (subCmd === 'accept') {
      const handoffId = args[1];
      if (!handoffId) { console.error('Usage: aidrive handoff accept <handoff_id>'); break; }
      const data = await apiCall(`/handoffs/${handoffId}/accept`, { method: 'POST' });
      output(data, `✅ Handoff accepted! ID: ${handoffId}`);
    } else if (subCmd === 'request-more') {
      const handoffId = args[1];
      const qIdx = args.indexOf('--questions');
      const questions = qIdx > -1 ? args[qIdx + 1]?.split(',').map(s => s.trim()) : undefined;
      if (!handoffId || !questions) { console.error('Usage: aidrive handoff request-more <handoff_id> --questions "q1,q2"'); break; }
      const data = await apiCall(`/handoffs/${handoffId}/request-more`, { method: 'POST', body: JSON.stringify({ questions }) });
      output(data, `✅ More info requested! ID: ${handoffId}\n   Questions: ${questions.join(', ')}`);
    } else if (subCmd === 'list') {
      const roleIdx = args.indexOf('--role');
      const statusIdx = args.indexOf('--status');
      const params = new URLSearchParams();
      if (roleIdx > -1 && args[roleIdx + 1]) params.set('role', args[roleIdx + 1]);
      if (statusIdx > -1 && args[statusIdx + 1]) params.set('status', args[statusIdx + 1]);
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await apiCall(`/handoffs${qs}`);
      const items = Array.isArray(data) ? data : data.handoffs || [];
      if (jsonMode) { console.log(JSON.stringify(items, null, 2)); break; }
      if (items.length === 0) { console.log('📭 No handoffs found'); break; }
      for (const h of items) {
        const dir = h.from_user_name ? `${h.from_user_name} → ${h.to_user_name}` : `${h.fromUserId?.slice(0,8)} → ${h.toUserId?.slice(0,8)}`;
        const task = (h.contextPack as any)?.task || '';
        console.log(`📤 [${h.status}] ${dir} — ${task.slice(0, 60)} (${h.id})`);
      }
      console.log(`\n共 ${items.length} 个 handoff`);
    } else {
      console.log('Usage: aidrive handoff <send|accept|request-more|list>');
      console.log('  aidrive handoff send --to <email> --workspace <id> --task "..." --next-steps "s1,s2"');
      console.log('  aidrive handoff accept <handoff_id>');
      console.log('  aidrive handoff request-more <handoff_id> --questions "q1,q2"');
      console.log('  aidrive handoff list [--role from|to] [--status sent|received|accepted]');
    }
    break;
  }

  case 'context': {
    const profileData = await apiCall('/users/me/profile');
    const foldersData = await apiCall('/folders');
    const folders = Array.isArray(foldersData) ? foldersData : foldersData?.folders || [];
    if (jsonMode) { console.log(JSON.stringify({ profile: profileData, projects: folders }, null, 2)); break; }
    console.log('🧠 Identity');
    console.log(`   角色: ${profileData.role || '未设置'}`);
    console.log(`   目标: ${profileData.currentGoal || '未设置'}`);
    console.log(`   背景: ${profileData.background || '未设置'}`);
    console.log(`\n📁 Projects (${folders.length})`);
    for (const f of folders) {
      console.log(`   ${f.name} ${f.status ? `[${f.status}]` : ''} ${f.brief ? `— ${f.brief}` : ''}`);
    }
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

  case 'project': {
    const subCmd = args[0];
    if (subCmd === 'set') {
      const folderId = args[1];
      const key = args[2];
      const value = args.slice(3).join(' ');
      if (!folderId || !key || !value) { console.error('Usage: aidrive project set <folder-id> <brief|status|goal> <value>'); break; }
      await apiCall(`/folders/${folderId}`, { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
      console.log(`✅ 已设置 ${key}: ${value}`);
    } else if (subCmd === 'list') {
      const data = await apiCall('/folders');
      const folders = Array.isArray(data) ? data : data?.folders || [];
      if (jsonMode) { console.log(JSON.stringify(folders, null, 2)); break; }
      for (const f of folders) {
        console.log(`📁 ${f.name} ${f.status ? `[${f.status}]` : ''}`);
        if (f.brief) console.log(`   ${f.brief}`);
        if (f.goal) console.log(`   🎯 ${f.goal}`);
      }
    } else {
      console.log('Usage: aidrive project <list|set>');
    }
    break;
  }

  case 'profile': {
    if (args[0] === 'set') {
      const key = args[1];
      const value = args.slice(2).join(' ');
      if (!key || !value) { console.error('Usage: aidrive profile set <key> <value>'); break; }
      await apiCall('/users/me/profile', { method: 'PATCH', body: JSON.stringify({ [key]: value }) });
      console.log(`✅ 已设置 ${key}: ${value}`);
    } else {
      const data = await apiCall('/users/me/profile');
      output(data, `🧠 AI 档案\n  角色: ${data.role || '未设置'}\n  目标: ${data.currentGoal || '未设置'}\n  背景: ${data.background || '未设置'}\n  偏好: ${data.preferences || '未设置'}`);
    }
    break;
  }

  case 'help':
  case undefined:
  default:
    console.log(`
🧠 AI Drive CLI — Agent 的共享记忆运行时

记忆操作:
  aidrive init <project>        创建项目
  aidrive recall <query>        回忆（语义搜索）
  aidrive commit <content>      存入知识
  aidrive pack <folder-id>      项目交接包
  aidrive handoff <folder-id>   交接包（pack 别名）
  aidrive context               查看 Identity + 项目列表

知识管理:
  aidrive upload <file>         上传文件
  aidrive store <text>          快速存入
  aidrive search <query>        语义搜索
  aidrive ask <question>        RAG 问答

文件操作:
  aidrive files [--brief]       列出文件
  aidrive info <file-id>        文件详情
  aidrive delete <file-id>      删除文件
  aidrive rename <id> <name>    重命名

项目管理:
  aidrive project list          列出项目
  aidrive project set <id> <key> <value>  设置项目属性

AI 能力:
  aidrive insights              AI 洞察
  aidrive timeline              时间线
  aidrive profile               查看/设置个人档案

配置:
  aidrive login --key <key>     设置 API Key
  aidrive config show           显示配置

全局选项:
  --json                        JSON 输出
`);
    break;
}
