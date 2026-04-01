# 🦞 龙虾监控站 (Lobster Monitor Station)

AI Drive 多 Agent 系统的公开只读监控站。

## 功能

- **Dashboard** — 7 个 Agent 的实时状态卡片（在线/忙碌/离线）
- **Agent 详情** — 单个 Agent 的完整任务列表（按状态分组）
- **Memory 浏览** — 按日期浏览各 Agent 的蒸馏记录（Markdown 渲染）
- **自动刷新** — 30s 轮询 + 手动刷新
- **响应式** — 桌面 / 平板 / 手机全适配

## 技术栈

- [Astro](https://astro.build) + React Islands
- [Tailwind CSS](https://tailwindcss.com)
- TypeScript

## 开发

```bash
pnpm install
pnpm --filter @ai-drive/monitor-web dev
```

Dev server: http://localhost:4321

## 构建

```bash
pnpm --filter @ai-drive/monitor-web build
```

静态输出到 `dist/`，部署到 Cloudflare Pages。

## 项目结构

```
src/
├── pages/           # Astro 页面路由
│   ├── index.astro          # Dashboard
│   ├── agent/[id].astro     # Agent 详情
│   └── memory/              # Memory 浏览
├── components/      # React Islands
│   ├── Dashboard.tsx
│   ├── AgentCard.tsx
│   ├── AgentDetail.tsx
│   ├── TaskList.tsx
│   ├── MemoryBrowser.tsx
│   ├── MemoryViewer.tsx
│   ├── StatusBadge.tsx
│   ├── TaskStatusBadge.tsx
│   ├── TaskCount.tsx
│   ├── DatePicker.tsx
│   └── RefreshIndicator.tsx
├── layouts/         # 通用布局
├── lib/             # 工具和数据层
│   ├── api.ts               # API client (mock/real 切换)
│   ├── types.ts             # TypeScript 类型
│   ├── constants.ts         # Agent 配置
│   ├── mock.ts              # Mock 数据
│   ├── utils.ts             # 工具函数
│   └── usePolling.ts        # 轮询 hook
└── styles/          # 全局样式
```

## 设计

Apple/Linear 风格：极简、大量留白、浅色主题、低饱和状态色。

## API 集成

当前使用 mock 数据（`src/lib/api.ts` 中 `USE_MOCK = true`）。
Backend API 就绪后设置 `USE_MOCK = false` 切换到真实数据。

API 端点：
- `GET /api/agents` — Agent 列表 + 状态
- `GET /api/agents/:id` — Agent 详情
- `GET /api/agents/:id/tasks` — Agent 任务列表
- `GET /api/memory?date=YYYY-MM-DD` — Memory 列表
- `GET /api/memory/:agent/:filename` — Memory 内容
