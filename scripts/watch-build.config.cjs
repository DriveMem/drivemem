module.exports = {
  apps: [{
    name: 'build-watcher',
    script: './scripts/watch-build.sh',
    cwd: '/home/ubuntu/repos/ai-drive',
    interpreter: '/bin/bash',
    autorestart: true,
    max_restarts: 100,
    min_uptime: '10s',
  }]
};
