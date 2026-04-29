import http from 'node:http';
import { execSync } from 'node:child_process';
import crypto from 'node:crypto';

const PORT = 9876;
const SECRET = process.env.WEBHOOK_SECRET || 'drivemem-deploy-2026';
const REPO_DIR = '/home/ubuntu/repos/ai-drive';

function verifySignature(payload, signature) {
  if (!signature) return false;
  const sig = 'sha256=' + crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    const signature = req.headers['x-hub-signature-256'];
    if (!verifySignature(body, signature)) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    try {
      const payload = JSON.parse(body);
      if (payload.ref !== 'refs/heads/main') {
        res.writeHead(200);
        res.end('Not main branch, skipping');
        return;
      }
    } catch {}

    res.writeHead(200);
    res.end('Deploying...');

    // Async deploy
    setTimeout(() => {
      try {
        console.log(`[${new Date().toISOString()}] Deploy triggered`);
        execSync(`cd ${REPO_DIR} && git pull --ff-only`, { stdio: 'inherit', timeout: 30000 });
        execSync(`cd ${REPO_DIR}/packages/shared-types && npx tsc`, { stdio: 'inherit', timeout: 30000 });
        execSync(`cd ${REPO_DIR}/packages/shared && npx tsc`, { stdio: 'inherit', timeout: 30000 });
        execSync(`cd ${REPO_DIR}/apps/api && npx tsc`, { stdio: 'inherit', timeout: 60000 });
        execSync(`cd ${REPO_DIR}/apps/web && rm -rf .next && npx next build`, { stdio: 'inherit', timeout: 180000 });
        execSync(`cd ${REPO_DIR} && pm2 restart ai-drive-api ai-drive-worker ai-drive-web --update-env`, { stdio: 'inherit', timeout: 30000 });
        console.log(`[${new Date().toISOString()}] Deploy complete ✅`);
      } catch (err) {
        console.error(`[${new Date().toISOString()}] Deploy failed:`, err.message);
      }
    }, 1000);
  });
});

server.listen(PORT, () => {
  console.log(`Deploy webhook listening on port ${PORT}`);
});
