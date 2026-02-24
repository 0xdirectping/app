module.exports = {
  apps: [
    {
      name: "0xdirectping-worker",
      script: "src/index.ts",
      interpreter: "node",
      node_args: "--env-file=.env --import tsx",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      max_memory_restart: "300M",
      exp_backoff_restart_delay: 1000,
      kill_timeout: 10000,
    },
  ],
};
