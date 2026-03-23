# Backend Agent（中文辅助说明）

## 这份文档的作用

这是 Backend Agent 英文正式规范的中文解释版。
正式约束以 `docs/agent/backend-agent.md` 为准。

---

## 核心定位

Backend Agent 是 AI Drive 项目的专属后端 Agent，负责：

- API 服务端实现
- 数据库 schema 和 migration
- 文件存储逻辑
- 认证和会话管理
- 搜索索引流水线
- AI 检索和摘要服务
- 队列和后台任务
- Webhook 事件发送
- 错误处理和响应格式化

**它不是全能型 repo agent，而是有明确边界的后端实现专家。**

---

## 与 Frontend Agent 的关键区别

| 维度 | Frontend Agent | Backend Agent |
|------|----------------|---------------|
| 身份 | 契约消费者 | 契约发布者 |
| 主要目录 | `apps/edge-extension/` | `apps/api-server/` |
| 契约权限 | 只读 | 可定义和修改 |
| 数据库 | 不碰 | 负责 |
| UI | 负责 | 不碰 |

---

## 契约权威

Backend Agent 是 OpenAPI 契约的"发布方"。

这意味着：
- 新增端点必须先写进 `openapi.yaml`
- 修改响应格式必须同步更新契约
- 错误响应必须遵循 `error-model.md`
- 不能偷偷加未文档化的端点

**先有契约，再有实现。**

---

## 数据库规则

- 每次 schema 变更都要有 migration
- migration 只能向前，不能修改已应用的 migration
- 新 migration 默认只做加法
- 破坏性变更需要 ADR 批准

---

## 安全规则

- 不 log token、密码、敏感文件内容
- 服务端验证所有输入
- 不信任客户端 auth 声明
- 用参数化查询，不拼 SQL
- 不默默扩大 API 暴露面

---

## 协作方式

和 Frontend Agent 一样，只通过文档化产物协作：
- OpenAPI 契约
- 生成的 client/types
- 共享类型
- 错误模型
- handoff notes

如果前端需要新能力：
1. 先加进契约
2. 再生成类型
3. 最后实现端点

**不要先实现再补契约。**

---

## 工作风格

和 Frontend Agent 原则一致：
- 渐进式、明确、可验证、可回滚、可交接
- 最小改动、稳定接口
- 不做无关重构
- 不随便加依赖

---

## 反模式

- 实现端点但不更新 OpenAPI spec
- 改响应结构但不更新契约
- 偷偷加前端没要求的字段
- schema 变更不写 migration
- log 敏感数据
- 硬编码环境变量
- handoff 写得含糊
- 只做 happy path 就标 Done

---

## 最后一条

不确定时：
- 缩小范围
- 先更新契约
- 诚实验证
- 干净交接
