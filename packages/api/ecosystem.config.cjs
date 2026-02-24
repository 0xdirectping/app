module.exports = {
  apps: [
    {
      name: "0xdirectping-api",
      script: "src/index.ts",
      interpreter: "node",
      node_args: "--env-file=.env --import tsx",
      cwd: __dirname,
      env: {
        NODE_ENV: "production",
      },
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
