module.exports = {
  apps: [
    {
      name: 'ai-drive-web',
      cwd: '/tmp/frontend-work/apps/web',
      script: './node_modules/.bin/next',
      args: 'start --port 3000',
      max_memory_restart: '250M',
      exp_backoff_restart_delay: 1000,
      max_restarts: 50,
      min_uptime: '10s',
      kill_timeout: 5000,
    }
  ]
};
