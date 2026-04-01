# Environment & Bindings — monitor-worker

## Worker Bindings（wrangler.toml）

| Binding            | Type         | Value / ID                             | Description                          |
| ------------------ | ------------ | -------------------------------------- | ------------------------------------ |
| `MONITOR_DATA`     | R2 Bucket    | bucket: `monitor-data`                 | 存储 agent tasks 和 memory 文件      |
| `MONITOR_HEARTBEAT`| KV Namespace | id: `98ad0fb0de3049ec864eca589ef83e59` | 存储 agent 心跳状态                  |

## 同步脚本环境变量（infra/monitor-sync/）

以下变量由 `sync-heartbeat.sh`、`sync-tasks.sh`、`sync-memory.sh` 使用，从 `.env` 文件加载：

| Variable               | Required | Default                                  | Used By              | Description                        |
| ---------------------- | -------- | ---------------------------------------- | -------------------- | ---------------------------------- |
| `CLOUDFLARE_API_TOKEN` | ✅       | —                                        | sync-heartbeat       | Cloudflare API token（KV 写入）    |
| `CLOUDFLARE_ACCOUNT_ID`| ❌       | `41ccba169bc859c3f529c09f72882c5d`       | sync-heartbeat       | Cloudflare account ID              |
| `KV_NAMESPACE_ID`      | ❌       | `98ad0fb0de3049ec864eca589ef83e59`       | sync-heartbeat       | KV namespace ID（心跳数据）        |

> `sync-tasks.sh` 和 `sync-memory.sh` 通过 `wrangler r2 object put --remote` 上传，依赖 wrangler 登录状态（`wrangler login` 或 `CLOUDFLARE_API_TOKEN` 环境变量），不额外读取自定义环境变量。

## .env.example

见 `../../infra/monitor-sync/.env.example`。
