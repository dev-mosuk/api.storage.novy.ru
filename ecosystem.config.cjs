// pm2 start ecosystem.config.cjs
module.exports = {
  apps: [
    {
      name: 'api.storage.novy.ru',
      cwd: __dirname,
      script: 'dist/config/main.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 15,
      min_uptime: '10s',
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      kill_timeout: 5000,
      listen_timeout: 10000,
      max_memory_restart: '2048M',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
