module.exports = {
  apps: [
    {
      name: 'whatsapp-finance-bot',
      script: 'dist/index.js',
      cwd: __dirname,
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 20,
      watch: false,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
