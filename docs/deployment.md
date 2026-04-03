# AI Drive MVP 部署指南

## 1. 架构概览

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend API    │────▶│  PostgreSQL   │
│ Vercel       │     │ EC2 (Fastify+PM2)│     │  AWS RDS      │
│ verrrnm.cloud│     │api.verrrnm.cloud │     └──────────────┘
└──────────────┘     │                  │────▶┌──────────────┐
                     │                  │     │  Redis        │
                     │                  │     │  Upstash      │
                     └──────┬─────┬─────┘     └──────────────┘
                            │     │
                    ┌───────┘     └────────┐
                    ▼                      ▼
             ┌──────────────┐     ┌──────────────┐
             │  AWS S3      │     │ Qdrant Cloud │
             │  文件存储     │     │ 向量数据库    │
             └──────────────┘     └──────────────┘
```

| 组件 | 服务 | 说明 |
|------|------|------|
| Frontend | Vercel (verrrnm.cloud) | Next.js SSR |
| Backend API | AWS EC2 (Fastify + PM2) | api.verrrnm.cloud |
| PostgreSQL | AWS RDS 或 Supabase | PostgreSQL 16 |
| Redis | Upstash 或 ElastiCache | 缓存 + BullMQ |
| S3 | AWS S3 | 文件存储 + CORS |
| Qdrant | Qdrant Cloud | 向量数据库 |

---

## 2. 前端部署 (Vercel)

### 步骤

1. 在 [Vercel](https://vercel.com) 导入 GitHub repo `yufuche1/ai-drive`
2. 配置项目设置：
   - **Root Directory**: `apps/web`
   - **Build Command**: `cd ../.. && pnpm build --filter web`
   - **Output Directory**: `apps/web/.next`
   - **Install Command**: `cd ../.. && pnpm install`
3. 配置环境变量（见下方）
4. 部署，绑定自定义域名 `verrrnm.cloud`

### 环境变量

| 变量 | 示例 | 说明 |
|------|------|------|
| `NEXTAUTH_URL` | `https://verrrnm.cloud` | NextAuth 回调地址 |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | NextAuth 签名密钥 |
| `NEXT_PUBLIC_API_URL` | `https://api.verrrnm.cloud` | 后端 API 地址 |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxx` | Google OAuth |

---

## 3. 后端部署 (EC2)

### 3.1 服务器准备

```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# pnpm
corepack enable
corepack prepare pnpm@latest --activate

# PM2
npm install -g pm2

# Nginx
sudo apt-get install -y nginx
```

### 3.2 代码部署

```bash
cd /opt
sudo git clone https://github.com/yufuche1/ai-drive.git
cd ai-drive
pnpm install

# 构建共享包
pnpm --filter @ai-drive/shared build

# 构建 API
pnpm --filter @ai-drive/api build
```

### 3.3 PM2 启动

```bash
# API 服务
pm2 start apps/api/dist/index.js --name ai-drive-api

# 解析 Worker
pm2 start apps/api/dist/workers/parse.worker.js --name ai-drive-worker

# 保存 & 开机自启
pm2 save
pm2 startup
```

### 3.4 Nginx 反向代理

```nginx
# /etc/nginx/sites-available/api.verrrnm.cloud
server {
    server_name api.verrrnm.cloud;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/api.verrrnm.cloud /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL (Let's Encrypt)
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.verrrnm.cloud
```

---

## 4. PostgreSQL (RDS)

### 创建实例

- **引擎**: PostgreSQL 16
- **实例类型**: db.t3.micro（开发/MVP）
- **存储**: 20 GB gp3
- **公开访问**: 否（仅 VPC 内部）

### 安全组

- 入站规则：允许 EC2 安全组访问 **端口 5432**

### 连接字符串

```
DATABASE_URL=postgresql://<user>:<password>@<rds-endpoint>:5432/ai_drive?schema=public
```

### 运行 Migration

```bash
cd /opt/ai-drive
pnpm db:migrate
```

---

## 5. Redis

### 方案 A: Upstash（推荐 MVP）

1. 在 [Upstash Console](https://console.upstash.com) 创建 Redis 数据库
2. 选择区域（与 EC2 同区域）
3. 获取连接信息：

```
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379
```

### 方案 B: ElastiCache

- **引擎**: Redis 7
- **节点类型**: cache.t3.micro
- **安全组**: 允许 EC2 访问端口 6379

```
REDIS_URL=redis://<elasticache-endpoint>:6379
```

---

## 6. S3

### 创建 Bucket

- **名称**: `ai-drive-files`
- **区域**: 与 EC2 同区域
- **阻止公共访问**: 开启（通过预签名 URL 访问）

### CORS 配置

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": [
      "https://verrrnm.cloud",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### IAM 用户

创建 IAM 用户 `ai-drive-s3`，附加策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::ai-drive-files",
        "arn:aws:s3:::ai-drive-files/*"
      ]
    }
  ]
}
```

获取 Access Key ID 和 Secret Access Key。

---

## 7. Qdrant Cloud

### 创建集群

1. 在 [Qdrant Cloud](https://cloud.qdrant.io) 创建免费集群
2. 选择区域（与 EC2 同区域优先）
3. 获取连接信息：
   - **URL**: `https://xxx.aws.cloud.qdrant.io:6333`
   - **API Key**: 在 Dashboard 生成

### Collection

Worker 首次启动时会自动创建所需 collection，无需手动操作。

---

## 8. 环境变量清单

在 EC2 上创建 `/opt/ai-drive/.env`：

```bash
# === Server ===
NODE_ENV=production
PORT=3001
API_BASE_URL=https://api.verrrnm.cloud
FRONTEND_URL=https://verrrnm.cloud

# === Auth ===
JWT_SECRET=<openssl rand -base64 32>
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# === Database ===
DATABASE_URL=postgresql://ai_drive:<password>@<rds-endpoint>:5432/ai_drive?schema=public

# === Redis ===
REDIS_URL=rediss://default:<password>@<endpoint>.upstash.io:6379

# === S3 ===
S3_BUCKET=ai-drive-files
S3_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# === Qdrant ===
QDRANT_URL=https://xxx.aws.cloud.qdrant.io:6333
QDRANT_API_KEY=...

# === OpenAI (Embedding) ===
OPENAI_API_KEY=sk-...
```

---

## 9. 健康检查

### API 健康检查

```bash
curl https://api.verrrnm.cloud/health
# 期望: {"status":"ok","timestamp":"..."}
```

### PM2 监控

```bash
pm2 status          # 查看所有进程状态
pm2 logs            # 实时日志
pm2 monit           # 交互式监控面板
pm2 logs ai-drive-api --lines 100  # API 最近 100 行日志
```

---

## 10. 常见问题

### Migration 失败

```bash
# 检查数据库连接
psql $DATABASE_URL -c "SELECT 1"

# 重置并重新运行（⚠️ 会清除数据）
pnpm db:reset

# 仅运行 pending migration
pnpm db:migrate
```

常见原因：
- 安全组未开放 5432 端口
- DATABASE_URL 格式错误
- RDS 实例未在运行状态

### S3 CORS 问题

症状：前端上传文件时浏览器控制台报 CORS 错误。

排查：
1. 确认 S3 Bucket CORS 配置中 `AllowedOrigins` 包含前端域名
2. 确认请求方法（PUT/GET）在 `AllowedMethods` 中
3. 使用 `curl -v -X OPTIONS` 测试预检请求
4. 清除 CloudFront 缓存（如使用 CDN）

### Qdrant 连接问题

```bash
# 测试连接
curl -H "api-key: $QDRANT_API_KEY" $QDRANT_URL/collections

# 常见原因
# - API Key 错误或过期
# - URL 缺少端口号 :6333
# - 集群处于休眠状态（免费版）
```

### PM2 进程崩溃循环

```bash
pm2 logs ai-drive-api --err --lines 50  # 查看错误日志
pm2 describe ai-drive-api               # 查看重启次数

# 常见原因
# - .env 文件缺少必需变量
# - 端口被占用
# - Node.js 版本不兼容
```
