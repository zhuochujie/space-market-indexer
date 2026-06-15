module.exports = {
  apps: [
    {
      name: "space-market-indexer",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      interpreter: "none",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      kill_timeout: 10_000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
