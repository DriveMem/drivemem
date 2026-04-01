import type { Agent, Task, MemoryEntry } from './types';

// Mock data uses partial shapes — type assertions are intentional
export const mockAgents = [
  {
    id: 'main',
    name: '牛马',
    emoji: '🐂',
    status: 'online',
    lastHeartbeat: new Date(Date.now() - 2 * 60000).toISOString(),
    tasks: { queue: 0, active: 0, blocked: 0, done: 5 },
  },
  {
    id: 'ad-manager',
    name: 'AD Manager',
    emoji: '📋',
    status: 'online',
    lastHeartbeat: new Date(Date.now() - 1 * 60000).toISOString(),
    tasks: { queue: 0, active: 0, blocked: 0, done: 2 },
  },
  {
    id: 'ad-master',
    name: 'AD Master',
    emoji: '🧭',
    status: 'busy',
    lastHeartbeat: new Date(Date.now() - 30000).toISOString(),
    tasks: { queue: 1, active: 1, blocked: 0, done: 3 },
    currentTask: '龙虾系统监控站架构设计',
  },
  {
    id: 'ad-frontend',
    name: 'AD Frontend Coder',
    emoji: '🎨',
    status: 'busy',
    lastHeartbeat: new Date(Date.now() - 45000).toISOString(),
    tasks: { queue: 1, active: 1, blocked: 0, done: 1 },
    currentTask: 'Dashboard + AgentCard 实现',
  },
  {
    id: 'ad-backend',
    name: 'AD Backend Coder',
    emoji: '⚙️',
    status: 'busy',
    lastHeartbeat: new Date(Date.now() - 60000).toISOString(),
    tasks: { queue: 0, active: 2, blocked: 1, done: 1 },
    currentTask: 'Worker API 开发',
  },
  {
    id: 'ad-tester',
    name: 'AD Tester',
    emoji: '🧪',
    status: 'online',
    lastHeartbeat: new Date(Date.now() - 3 * 60000).toISOString(),
    tasks: { queue: 1, active: 0, blocked: 0, done: 0 },
  },
  {
    id: 'ad-operator',
    name: 'AD Operator',
    emoji: '🚀',
    status: 'offline',
    lastHeartbeat: new Date(Date.now() - 8 * 60000).toISOString(),
    tasks: { queue: 0, active: 1, blocked: 1, done: 0 },
    currentTask: 'Cloudflare 基础设施配置',
  },
] as Agent[];

export const mockTasks = {
  'ad-master': [
    {
      id: 'arch-design',
      title: '龙虾系统监控站架构设计',
      status: 'active',
      created_at: '2026-04-01T14:30:00+08:00',
      updated_at: '2026-04-01T14:50:00+08:00',
      checkpoint: '架构文档完成，等待 review',
    },
    {
      id: 'task-dispatch',
      title: '下游任务分发',
      status: 'queue',
      created_at: '2026-04-01T14:50:00+08:00',
      updated_at: '2026-04-01T14:50:00+08:00',
    },
    {
      id: 'spec-review',
      title: '产品 Spec 审核',
      status: 'done',
      created_at: '2026-04-01T13:00:00+08:00',
      updated_at: '2026-04-01T14:00:00+08:00',
      checkpoint: '已确认，交给 Manager',
    },
    {
      id: 'tech-selection',
      title: '技术选型评估',
      status: 'done',
      created_at: '2026-04-01T13:30:00+08:00',
      updated_at: '2026-04-01T14:20:00+08:00',
    },
    {
      id: 'api-design',
      title: 'API 接口设计',
      status: 'done',
      created_at: '2026-04-01T14:00:00+08:00',
      updated_at: '2026-04-01T14:45:00+08:00',
      checkpoint: '6 endpoints 已定义',
    },
  ],
  'ad-frontend': [
    {
      id: 'F-scaffold',
      title: '前端项目初始化（Astro + React + Tailwind）',
      status: 'done',
      created_at: '2026-04-01T14:54:00+08:00',
      updated_at: '2026-04-01T14:58:00+08:00',
      checkpoint: '10 pages built, TypeScript clean',
    },
    {
      id: 'F-dashboard',
      title: 'Dashboard + AgentCard 实现',
      status: 'active',
      created_at: '2026-04-01T14:58:00+08:00',
      updated_at: '2026-04-01T15:02:00+08:00',
      checkpoint: 'Mock 数据先行，7 卡片完成',
    },
    {
      id: 'F-pages',
      title: '三大页面实现（详情+Memory）',
      status: 'queue',
      created_at: '2026-04-01T15:02:00+08:00',
      updated_at: '2026-04-01T15:02:00+08:00',
    },
  ],
  'ad-backend': [
    {
      id: 'B-shared-types',
      title: 'Monitor 共享类型定义',
      status: 'done',
      created_at: '2026-04-01T14:55:00+08:00',
      updated_at: '2026-04-01T14:57:00+08:00',
    },
    {
      id: 'B-worker-api',
      title: 'Worker API 骨架 + 路由实现',
      status: 'active',
      created_at: '2026-04-01T14:57:00+08:00',
      updated_at: '2026-04-01T15:00:00+08:00',
      checkpoint: 'Hono 初始化，6 endpoints 编写中',
    },
    {
      id: 'B-data-pipeline',
      title: '数据同步脚本',
      status: 'blocked',
      created_at: '2026-04-01T14:55:00+08:00',
      updated_at: '2026-04-01T14:58:00+08:00',
      checkpoint: '等待 Operator 基础设施就绪',
    },
  ],
  'ad-operator': [
    {
      id: 'O-infra-setup',
      title: 'Cloudflare 基础设施配置',
      status: 'active',
      created_at: '2026-04-01T14:55:00+08:00',
      updated_at: '2026-04-01T14:58:00+08:00',
      checkpoint: '等待老板配置 API token',
    },
    {
      id: 'O-deploy',
      title: 'Pages 部署 + Worker 绑定',
      status: 'blocked',
      created_at: '2026-04-01T14:55:00+08:00',
      updated_at: '2026-04-01T14:55:00+08:00',
      checkpoint: '依赖前后端完成',
    },
  ],
  'ad-tester': [
    {
      id: 'T-e2e-verify',
      title: '端到端验证',
      status: 'queue',
      created_at: '2026-04-01T14:55:00+08:00',
      updated_at: '2026-04-01T14:55:00+08:00',
    },
  ],
  'main': [],
  'ad-manager': [],
} as unknown as Record<string, Task[]>;

// Memory mock data
export const mockMemoryEntries: Record<string, MemoryEntry[]> = {
  '2026-04-01': [
    {
      agent: 'ad-master',
      filename: '2026-04-01-monitor-arch.md',
      date: '2026-04-01',
      content: `# 2026-04-01 龙虾监控站架构设计 — 蒸馏卡

## 任务目标
设计龙虾系统监控站的完整技术架构

## 关键决策
- 全 Cloudflare 栈：Pages + Workers + R2 + KV
- 前端选型 Astro + React Islands（静态优先 + 按需 hydrate）
- API 使用 Pages Functions（Hono），同源无 CORS
- 心跳数据通过 KV 持久化，5 分钟超时判定

## 当前状态
已完成

## 下一步
- 等待下游各 agent 完成实现
- 预计 3-4 天 critical path`,
    },
    {
      agent: 'ad-manager',
      filename: '2026-04-01-spec-v0.2.md',
      date: '2026-04-01',
      content: `# 2026-04-01 监控站 Spec v0.2 — 蒸馏卡

## 任务目标
定义龙虾系统监控站 v1 产品范围

## 关键决策
- 3 大功能模块：Agent 状态、任务监控、Memory 浏览
- 设计方向：Apple 设计语言，极简科技感
- Public 只读站点，无认证
- 域名 vrrrnm.cloud

## 当前状态
已完成，已交付 AD Master`,
    },
    {
      agent: 'ad-frontend',
      filename: '2026-04-01-scaffold-done.md',
      date: '2026-04-01',
      content: `# 2026-04-01 前端项目初始化 — 蒸馏卡

## 任务目标
初始化 apps/monitor-web 项目骨架

## 关键决策
- Astro 5 + React Islands + Tailwind CSS
- Apple 风格 design tokens（低饱和色、Inter 字体）
- 路由结构：Dashboard / Agent Detail / Memory Browser

## 当前状态
已完成

## 下一步
F-2 Dashboard + AgentCard → F-3 详情页 → F-4 Memory 页`,
    },
    {
      agent: 'ad-backend',
      filename: '2026-04-01-shared-types.md',
      date: '2026-04-01',
      content: `# 2026-04-01 共享类型定义 — 蒸馏卡

## 任务目标
定义 monitor 相关的 TypeScript 共享类型

## 关键决策
- 类型放在 packages/shared-types
- 包含 Agent/Task/Heartbeat/Memory/API Response 类型
- 前后端共用

## 当前状态
已完成`,
    },
  ],
  '2026-03-31': [
    {
      agent: 'main',
      filename: '2026-03-31-system-init.md',
      date: '2026-03-31',
      content: `# 2026-03-31 龙虾多 Agent 系统初始化 — 蒸馏卡

## 任务目标
搭建龙虾多 agent 协作系统

## 关键决策
- 7 个 agent 配置就位
- Non-Blocking Protocol 写入所有 agent
- Session context 管理配置完成
- Agent 间 Discord 通信打通

## 当前状态
已完成`,
    },
  ],
};
